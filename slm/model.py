"""A tiny GPT-style character-level language model, built from the
hand-written autograd engine in `slm.autograd` (NumPy only, no ML framework).
"""

import numpy as np

from .autograd import Tensor, cat, cross_entropy, embedding, layer_norm, softmax


class GPTConfig:
    def __init__(self, vocab_size, block_size=64, n_embd=64, n_head=4, n_layer=2):
        assert n_embd % n_head == 0, "n_embd must be divisible by n_head"
        self.vocab_size = vocab_size
        self.block_size = block_size
        self.n_embd = n_embd
        self.n_head = n_head
        self.n_layer = n_layer


def _uniform(shape, fan_in):
    scale = 1.0 / np.sqrt(fan_in)
    return Tensor(np.random.uniform(-scale, scale, size=shape), requires_grad=True)


def _zeros(shape):
    return Tensor(np.zeros(shape), requires_grad=True)


def _ones(shape):
    return Tensor(np.ones(shape), requires_grad=True)


class Linear:
    def __init__(self, in_features, out_features, bias=True):
        self.w = _uniform((in_features, out_features), fan_in=in_features)
        self.b = _zeros((out_features,)) if bias else None

    def __call__(self, x):
        out = x.matmul(self.w)
        return out + self.b if self.b is not None else out

    def parameters(self):
        return [self.w] + ([self.b] if self.b is not None else [])


class LayerNorm:
    def __init__(self, dim):
        self.gamma = _ones((dim,))
        self.beta = _zeros((dim,))

    def __call__(self, x):
        return layer_norm(x, self.gamma, self.beta)

    def parameters(self):
        return [self.gamma, self.beta]


class CausalSelfAttention:
    """Multi-head self-attention with a causal (no-peeking-ahead) mask."""

    def __init__(self, cfg: GPTConfig):
        self.n_head = cfg.n_head
        self.head_size = cfg.n_embd // cfg.n_head
        self.query = Linear(cfg.n_embd, cfg.n_embd)
        self.key = Linear(cfg.n_embd, cfg.n_embd)
        self.value = Linear(cfg.n_embd, cfg.n_embd)
        self.proj = Linear(cfg.n_embd, cfg.n_embd)

    def __call__(self, x):
        T = x.shape[0]
        q, k, v = self.query(x), self.key(x), self.value(x)
        causal_mask = np.triu(np.full((T, T), -1e9), k=1)
        scale = 1.0 / np.sqrt(self.head_size)

        head_outputs = []
        for h in range(self.n_head):
            cols = slice(h * self.head_size, (h + 1) * self.head_size)
            qh, kh, vh = q[:, cols], k[:, cols], v[:, cols]
            scores = qh.matmul(kh.transpose()) * scale
            attn = softmax(scores, axis=-1, mask=causal_mask)
            head_outputs.append(attn.matmul(vh))

        return self.proj(cat(head_outputs, axis=-1))

    def parameters(self):
        params = []
        for layer in (self.query, self.key, self.value, self.proj):
            params += layer.parameters()
        return params


class MLP:
    def __init__(self, cfg: GPTConfig):
        self.fc1 = Linear(cfg.n_embd, 4 * cfg.n_embd)
        self.fc2 = Linear(4 * cfg.n_embd, cfg.n_embd)

    def __call__(self, x):
        return self.fc2(self.fc1(x).gelu())

    def parameters(self):
        return self.fc1.parameters() + self.fc2.parameters()


class Block:
    """One transformer block: self-attention + MLP, each with a residual connection."""

    def __init__(self, cfg: GPTConfig):
        self.ln1 = LayerNorm(cfg.n_embd)
        self.attn = CausalSelfAttention(cfg)
        self.ln2 = LayerNorm(cfg.n_embd)
        self.mlp = MLP(cfg)

    def __call__(self, x):
        x = x + self.attn(self.ln1(x))
        x = x + self.mlp(self.ln2(x))
        return x

    def parameters(self):
        return (
            self.ln1.parameters()
            + self.attn.parameters()
            + self.ln2.parameters()
            + self.mlp.parameters()
        )


class SLM:
    """A small language model: token + positional embeddings feeding a stack
    of causal transformer blocks, followed by a linear layer over the vocab.
    """

    def __init__(self, cfg: GPTConfig):
        self.cfg = cfg
        self.tok_emb = Tensor(
            np.random.normal(0, 0.02, size=(cfg.vocab_size, cfg.n_embd)), requires_grad=True
        )
        self.pos_emb = Tensor(
            np.random.normal(0, 0.02, size=(cfg.block_size, cfg.n_embd)), requires_grad=True
        )
        self.blocks = [Block(cfg) for _ in range(cfg.n_layer)]
        self.ln_f = LayerNorm(cfg.n_embd)
        self.head = Linear(cfg.n_embd, cfg.vocab_size, bias=False)

    def parameters(self):
        params = [self.tok_emb, self.pos_emb]
        for block in self.blocks:
            params += block.parameters()
        params += self.ln_f.parameters()
        params += self.head.parameters()
        return params

    def forward(self, idx, targets=None):
        """idx: a list/array of up to block_size token ids for one sequence."""
        T = len(idx)
        assert T <= self.cfg.block_size, "sequence longer than block_size"

        x = embedding(self.tok_emb, idx) + self.pos_emb[0:T]
        for block in self.blocks:
            x = block(x)
        x = self.ln_f(x)
        logits = self.head(x)

        loss = cross_entropy(logits, targets) if targets is not None else None
        return logits, loss

    def expand_vocab(self, new_vocab_size):
        """Grow the token embedding table and output head for newly seen
        characters, keeping every weight learned so far.

        Rows/columns for the new characters are freshly initialized; the
        existing ones are copied across untouched, so teaching the model a
        character it has never seen does not erase its earlier training.
        """
        extra = new_vocab_size - self.cfg.vocab_size
        if extra <= 0:
            return

        n_embd = self.cfg.n_embd
        self.tok_emb.data = np.concatenate(
            [self.tok_emb.data, np.random.normal(0, 0.02, size=(extra, n_embd))], axis=0
        )
        self.tok_emb.grad = np.zeros_like(self.tok_emb.data)

        scale = 1.0 / np.sqrt(n_embd)
        self.head.w.data = np.concatenate(
            [self.head.w.data, np.random.uniform(-scale, scale, size=(n_embd, extra))], axis=1
        )
        self.head.w.grad = np.zeros_like(self.head.w.data)

        self.cfg.vocab_size = new_vocab_size

    def zero_grad(self):
        for p in self.parameters():
            p.zero_grad()

    def num_parameters(self):
        return sum(p.data.size for p in self.parameters())
