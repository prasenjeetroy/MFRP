# MFRP
MyFirstRealSFDCProject

## SLM: a small language model built from scratch in Python

A character-level GPT-style small language model (SLM), implemented from
first principles with only NumPy for array math — no PyTorch, TensorFlow,
or other ML framework. It includes its own reverse-mode autograd engine.

### Layout

- `slm/autograd.py` — minimal `Tensor` class with a hand-written computation
  graph and backward pass (add, mul, matmul, softmax, layer norm, cross
  entropy, embeddings, etc.)
- `slm/model.py` — the SLM itself: token + positional embeddings, causal
  multi-head self-attention, MLP blocks, layer norm, and an output head.
- `slm/optim.py` — a small Adam optimizer.
- `slm/tokenizer.py` — a character-level tokenizer.
- `slm/trainer.py` — batching and the shared training loop.
- `teach.py` — **interactive session**: type your own text, train, and ask the
  model to write something back, all from one prompt.
- `train.py` — trains the model on a text file.
- `generate.py` — generates text from a trained checkpoint.
- `data/corpus.txt` — a small sample training text.
- `tests/` — gradient checks for the autograd engine and a sanity test that
  training loss decreases.

### Usage

#### Interactive: type your own training text

```bash
pip install -r requirements.txt
python teach.py
```

You get a prompt with these commands:

| command  | what it does |
| -------- | ------------ |
| `teach`  | type or paste text for the model to learn from (blank line to finish) |
| `file`   | load training text from a `.txt` file instead of typing it |
| `train`  | practice on everything taught so far (Ctrl-C stops early, keeping progress) |
| `write`  | give it a starting phrase and watch it continue |
| `status` | how much text it has seen, how much it has practiced, current loss |
| `save`   | save the model so you can pick up later with `python teach.py --load mymodel.pkl` |
| `quit`   | leave |

You can keep teaching it new text between training rounds. If the new text
contains characters it has never seen, the vocabulary and the model grow to
fit them without losing anything already learned.

#### Non-interactive: train from a file

```bash
# Train on the sample corpus (or point --data at your own text file)
python train.py --data data/corpus.txt --iters 2000 --out checkpoint.pkl

# Generate text from the trained model
python generate.py --checkpoint checkpoint.pkl --prompt "The small" --length 300
```

Run the tests with:

```bash
python -m unittest discover -s tests
```

This is a small, from-scratch model meant for learning/demonstration — it
trains one sequence at a time in pure Python/NumPy, so it's best used with
modest hyperparameters and small-to-medium text corpora.
