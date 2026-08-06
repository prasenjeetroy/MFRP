"""Generate text from a trained SLM checkpoint.

Example:
    python generate.py --checkpoint checkpoint.pkl --prompt "The small" --length 300
"""

import argparse
import pickle

import numpy as np

from slm.model import GPTConfig, SLM
from slm.tokenizer import CharTokenizer


def sample_next_token(logits_row, temperature=0.8, top_k=None):
    logits_row = logits_row / max(temperature, 1e-6)
    if top_k is not None and top_k < len(logits_row):
        keep = np.argpartition(logits_row, -top_k)[-top_k:]
        masked = np.full_like(logits_row, -np.inf)
        masked[keep] = logits_row[keep]
        logits_row = masked
    logits_row = logits_row - np.max(logits_row)
    probs = np.exp(logits_row)
    probs /= probs.sum()
    return int(np.random.choice(len(probs), p=probs))


def main():
    parser = argparse.ArgumentParser(description="Generate text with a trained SLM.")
    parser.add_argument("--checkpoint", default="checkpoint.pkl")
    parser.add_argument("--prompt", default="The")
    parser.add_argument("--length", type=int, default=200, help="number of characters to generate")
    parser.add_argument("--temperature", type=float, default=0.8)
    parser.add_argument("--top-k", type=int, default=None)
    parser.add_argument("--seed", type=int, default=None)
    args = parser.parse_args()

    if args.seed is not None:
        np.random.seed(args.seed)

    with open(args.checkpoint, "rb") as f:
        ckpt = pickle.load(f)

    tokenizer = CharTokenizer.from_stoi(ckpt["stoi"])
    cfg = GPTConfig(**ckpt["cfg"])
    model = SLM(cfg)
    for p, saved_data in zip(model.parameters(), ckpt["params"]):
        p.data = saved_data

    idx = tokenizer.encode(args.prompt)
    if not idx:
        raise ValueError("prompt must contain at least one character seen during training")

    for _ in range(args.length):
        context = idx[-cfg.block_size :]
        logits, _ = model.forward(context)
        next_id = sample_next_token(logits.data[-1], temperature=args.temperature, top_k=args.top_k)
        idx.append(next_id)

    print(tokenizer.decode(idx))


if __name__ == "__main__":
    main()
