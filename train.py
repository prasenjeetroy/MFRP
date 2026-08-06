"""Train the from-scratch SLM (small language model) on a plain text file.

Example:
    python train.py --data data/corpus.txt --iters 2000 --out checkpoint.pkl
"""

import argparse
import pickle
import random

import numpy as np

from slm.model import GPTConfig, SLM
from slm.optim import Adam
from slm.tokenizer import CharTokenizer
from slm.trainer import train_steps


def main():
    parser = argparse.ArgumentParser(description="Train a small character-level language model.")
    parser.add_argument("--data", default="data/corpus.txt", help="path to a plain text training file")
    parser.add_argument("--out", default="checkpoint.pkl", help="where to save the trained model")
    parser.add_argument("--block-size", type=int, default=48, help="context length in characters")
    parser.add_argument("--n-embd", type=int, default=64, help="embedding dimension")
    parser.add_argument("--n-head", type=int, default=4, help="number of attention heads")
    parser.add_argument("--n-layer", type=int, default=2, help="number of transformer blocks")
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--iters", type=int, default=2000)
    parser.add_argument("--lr", type=float, default=3e-3)
    parser.add_argument("--seed", type=int, default=1337)
    parser.add_argument("--log-every", type=int, default=100)
    args = parser.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)

    with open(args.data, encoding="utf-8") as f:
        text = f.read()

    tokenizer = CharTokenizer(text)
    data = tokenizer.encode(text)
    if len(data) <= args.block_size:
        raise ValueError("training file is too short for the requested --block-size")

    cfg = GPTConfig(
        vocab_size=tokenizer.vocab_size,
        block_size=args.block_size,
        n_embd=args.n_embd,
        n_head=args.n_head,
        n_layer=args.n_layer,
    )
    model = SLM(cfg)
    optimizer = Adam(model.parameters(), lr=args.lr)

    print(f"vocab size: {cfg.vocab_size}, parameters: {model.num_parameters():,}")

    def on_log(step, loss):
        print(f"step {step:5d}/{args.iters}  loss {loss:.4f}")

    train_steps(
        model,
        optimizer,
        data,
        args.block_size,
        args.batch_size,
        args.iters,
        on_log=on_log,
        log_every=args.log_every,
    )

    with open(args.out, "wb") as f:
        pickle.dump(
            {
                "cfg": vars(cfg),
                "stoi": tokenizer.stoi,
                "params": [p.data for p in model.parameters()],
            },
            f,
        )
    print(f"saved checkpoint to {args.out}")


if __name__ == "__main__":
    main()
