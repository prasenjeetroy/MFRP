import os
import random
import sys
import unittest

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from slm.model import GPTConfig, SLM
from slm.optim import Adam
from slm.tokenizer import CharTokenizer


class TestSLM(unittest.TestCase):
    def test_forward_shapes(self):
        text = "hello world, hello small model"
        tok = CharTokenizer(text)
        cfg = GPTConfig(vocab_size=tok.vocab_size, block_size=8, n_embd=16, n_head=2, n_layer=1)
        model = SLM(cfg)

        ids = tok.encode(text[:8])
        logits, loss = model.forward(ids, ids)
        self.assertEqual(logits.shape, (8, tok.vocab_size))
        self.assertEqual(loss.shape, ())

    def test_training_reduces_loss(self):
        random.seed(0)
        np.random.seed(0)

        text = ("the small model reads a small book. " * 20)
        tok = CharTokenizer(text)
        data = tok.encode(text)
        block_size = 16

        cfg = GPTConfig(vocab_size=tok.vocab_size, block_size=block_size, n_embd=32, n_head=2, n_layer=1)
        model = SLM(cfg)
        optim = Adam(model.parameters(), lr=5e-3)

        def batch_loss():
            model.zero_grad()
            total = 0.0
            for _ in range(8):
                i = random.randint(0, len(data) - block_size - 1)
                chunk = data[i : i + block_size + 1]
                x, y = chunk[:-1], chunk[1:]
                _, loss = model.forward(x, y)
                loss.backward()
                total += loss.item()
            for p in model.parameters():
                p.grad /= 8
            optim.step()
            return total / 8

        first_losses = [batch_loss() for _ in range(5)]
        for _ in range(60):
            batch_loss()
        last_losses = [batch_loss() for _ in range(5)]

        self.assertLess(np.mean(last_losses), np.mean(first_losses))


if __name__ == "__main__":
    unittest.main()
