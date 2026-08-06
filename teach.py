"""Teach the small language model interactively.

Type your own text at the prompt, tell the model to practice on it, then ask
it to write something back. Nothing needs to be edited by hand.

    python teach.py                      # start fresh
    python teach.py --load mymodel.pkl   # continue an earlier session
"""

import argparse
import pickle
import sys

import numpy as np

from generate import sample_next_token
from slm.model import GPTConfig, SLM
from slm.optim import Adam
from slm.tokenizer import CharTokenizer
from slm.trainer import train_steps

MENU = """
Commands
  teach   type or paste text for the model to learn from
  file    load training text from a file on disk
  train   let the model practice on everything it has been taught
  write   give it a starting phrase and let it continue
  status  show how much text it has seen and how much it has practiced
  save    save the model to a file
  quit    leave the session
"""

MIN_TEXT = 64  # characters needed before training makes any sense


class Session:
    """Holds the text taught so far, the model, and its optimizer."""

    def __init__(self, block_size=48, n_embd=64, n_head=4, n_layer=2, lr=3e-3):
        self.text = ""
        self.tokenizer = CharTokenizer()
        self.model = None
        self.optimizer = None
        self.steps_trained = 0
        self.last_loss = None
        self.hparams = dict(
            block_size=block_size, n_embd=n_embd, n_head=n_head, n_layer=n_layer
        )
        self.lr = lr

    # ---- teaching ----
    def add_text(self, text):
        if not text.strip():
            return 0
        self.text += text if self.text.endswith("\n") or not self.text else "\n" + text
        new_chars = self.tokenizer.add_text(text)
        if self.model is not None and new_chars:
            self.model.expand_vocab(self.tokenizer.vocab_size)
            # Adam keeps per-parameter state sized to each array, so it has to
            # be rebuilt once the embedding table and head change shape.
            self.optimizer = Adam(self.model.parameters(), lr=self.lr)
        return new_chars

    # ---- model setup ----
    def ensure_model(self):
        if self.model is not None:
            return
        block_size = min(self.hparams["block_size"], len(self.text) - 1)
        cfg = GPTConfig(
            vocab_size=self.tokenizer.vocab_size,
            block_size=block_size,
            n_embd=self.hparams["n_embd"],
            n_head=self.hparams["n_head"],
            n_layer=self.hparams["n_layer"],
        )
        self.model = SLM(cfg)
        self.optimizer = Adam(self.model.parameters(), lr=self.lr)
        print(f"  created a model with {self.model.num_parameters():,} parameters")

    # ---- training ----
    def train(self, iters, batch_size=12):
        if len(self.text) < MIN_TEXT:
            print(f"  needs at least {MIN_TEXT} characters of text first — try 'teach'.")
            return
        self.ensure_model()

        data = self.tokenizer.encode(self.text)
        block_size = self.model.cfg.block_size

        def on_log(step, loss):
            bar = "#" * int(20 * step / iters)
            print(f"\r  [{bar:<20}] step {step}/{iters}  wrongness {loss:.3f}", end="", flush=True)

        print("  practicing... (press Ctrl-C to stop early and keep what it learned)")
        try:
            self.last_loss = train_steps(
                self.model,
                self.optimizer,
                data,
                block_size,
                batch_size,
                iters,
                on_log=on_log,
                log_every=max(1, iters // 40),
            )
            self.steps_trained += iters
        except KeyboardInterrupt:
            print("\n  stopped early — everything learned so far is kept.")
            return
        print("\n  done.")

    # ---- generation ----
    def write(self, prompt, length=200, temperature=0.8):
        if self.model is None:
            print("  nothing learned yet — use 'teach' then 'train' first.")
            return
        unknown = self.tokenizer.unknown_chars(prompt)
        if unknown:
            print(f"  (never seen these characters, ignoring them: {' '.join(unknown)})")
        idx = self.tokenizer.encode(prompt, skip_unknown=True)
        if not idx:
            print("  that prompt has no characters the model has seen — try another.")
            return

        for _ in range(length):
            context = idx[-self.model.cfg.block_size :]
            logits, _ = self.model.forward(context)
            idx.append(sample_next_token(logits.data[-1], temperature=temperature))

        print("\n" + "-" * 60)
        print(self.tokenizer.decode(idx))
        print("-" * 60)

    # ---- persistence ----
    def save(self, path):
        if self.model is None:
            print("  nothing to save yet.")
            return
        with open(path, "wb") as f:
            pickle.dump(
                {
                    "cfg": vars(self.model.cfg),
                    "stoi": self.tokenizer.stoi,
                    "params": [p.data for p in self.model.parameters()],
                    "text": self.text,
                    "steps_trained": self.steps_trained,
                },
                f,
            )
        print(f"  saved to {path}")

    def load(self, path):
        with open(path, "rb") as f:
            ckpt = pickle.load(f)
        self.tokenizer = CharTokenizer.from_stoi(ckpt["stoi"])
        self.model = SLM(GPTConfig(**ckpt["cfg"]))
        for p, data in zip(self.model.parameters(), ckpt["params"]):
            p.data = data
        self.optimizer = Adam(self.model.parameters(), lr=self.lr)
        self.text = ckpt.get("text", "")
        self.steps_trained = ckpt.get("steps_trained", 0)
        print(f"  loaded {path} ({self.model.num_parameters():,} parameters)")

    def status(self):
        print(f"  text taught      : {len(self.text)} characters")
        print(f"  different letters: {self.tokenizer.vocab_size}")
        print(f"  practice rounds  : {self.steps_trained}")
        if self.last_loss is not None:
            print(f"  wrongness score  : {self.last_loss:.3f} (lower is better)")
        if self.model is None:
            print("  model            : not created yet (happens on first 'train')")
        else:
            print(f"  model            : {self.model.num_parameters():,} parameters")


def ask(prompt, default=None, cast=str):
    """Read one line, falling back to `default` on blank input or EOF."""
    try:
        raw = input(prompt).strip()
    except EOFError:
        return default
    if not raw:
        return default
    try:
        return cast(raw)
    except ValueError:
        print(f"  didn't understand that, using {default}")
        return default


def read_block():
    """Read multi-line text until the user enters a blank line."""
    print("  Type or paste your text. Press Enter on an empty line when finished.")
    lines = []
    while True:
        try:
            line = input("  > ")
        except EOFError:
            break
        if line.strip() == "":
            break
        lines.append(line)
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Teach a small language model interactively.")
    parser.add_argument("--load", help="continue from a saved model file")
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--n-embd", type=int, default=64)
    parser.add_argument("--n-head", type=int, default=4)
    parser.add_argument("--n-layer", type=int, default=2)
    parser.add_argument("--block-size", type=int, default=48)
    parser.add_argument("--lr", type=float, default=3e-3)
    args = parser.parse_args()

    if args.seed is not None:
        np.random.seed(args.seed)

    session = Session(
        block_size=args.block_size,
        n_embd=args.n_embd,
        n_head=args.n_head,
        n_layer=args.n_layer,
        lr=args.lr,
    )
    if args.load:
        session.load(args.load)

    print("=" * 60)
    print(" Teach your own small language model")
    print("=" * 60)
    print(MENU)

    while True:
        cmd = ask("\ncommand> ", default="help")
        if cmd is None:
            break
        cmd = cmd.lower()

        if cmd in ("quit", "exit", "q"):
            print("bye!")
            break
        elif cmd in ("help", "?"):
            print(MENU)
        elif cmd == "teach":
            text = read_block()
            added = session.add_text(text)
            if text.strip():
                print(f"  learned {len(text)} characters of new text ({added} new letters/symbols)")
                print(f"  total text so far: {len(session.text)} characters")
        elif cmd == "file":
            path = ask("  path to a .txt file: ")
            if not path:
                continue
            try:
                with open(path, encoding="utf-8") as f:
                    text = f.read()
            except OSError as e:
                print(f"  couldn't read that file: {e}")
                continue
            session.add_text(text)
            print(f"  added {len(text)} characters from {path}")
        elif cmd == "train":
            iters = ask("  how many practice rounds? [500] ", default=500, cast=int)
            session.train(iters)
        elif cmd == "write":
            prompt = ask("  starting phrase: ", default="The")
            length = ask("  how many characters? [200] ", default=200, cast=int)
            temp = ask("  creativity 0.2-1.2? [0.8] ", default=0.8, cast=float)
            session.write(prompt, length=length, temperature=temp)
        elif cmd == "status":
            session.status()
        elif cmd == "save":
            path = ask("  save to which file? [mymodel.pkl] ", default="mymodel.pkl")
            session.save(path)
        else:
            print(f"  unknown command: {cmd!r}")
            print(MENU)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nbye!")
        sys.exit(0)
