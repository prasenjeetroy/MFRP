import os
import sys
import unittest

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from slm.autograd import Tensor, cat, cross_entropy, embedding, layer_norm, softmax


def numerical_grad(f, x, eps=1e-5):
    grad = np.zeros_like(x)
    it = np.nditer(x, flags=["multi_index"])
    for _ in it:
        idx = it.multi_index
        orig = x[idx]
        x[idx] = orig + eps
        plus = f()
        x[idx] = orig - eps
        minus = f()
        x[idx] = orig
        grad[idx] = (plus - minus) / (2 * eps)
    return grad


class TestAutograd(unittest.TestCase):
    def test_matmul_and_add(self):
        np.random.seed(0)
        a = Tensor(np.random.randn(3, 4), requires_grad=True)
        b = Tensor(np.random.randn(4, 2), requires_grad=True)
        bias = Tensor(np.random.randn(2), requires_grad=True)

        def forward():
            return ((a.matmul(b) + bias).relu().sum()).item()

        out = (a.matmul(b) + bias).relu()
        loss = out.sum()
        loss.backward()

        num_a = numerical_grad(forward, a.data)
        num_b = numerical_grad(forward, b.data)
        np.testing.assert_allclose(a.grad, num_a, atol=1e-4)
        np.testing.assert_allclose(b.grad, num_b, atol=1e-4)

    def test_softmax_and_cross_entropy(self):
        np.random.seed(1)
        logits = Tensor(np.random.randn(3, 5), requires_grad=True)
        targets = np.array([0, 2, 4])

        def forward():
            l = Tensor(logits.data.copy())
            return cross_entropy(l, targets).item()

        loss = cross_entropy(logits, targets)
        loss.backward()
        num = numerical_grad(forward, logits.data)
        np.testing.assert_allclose(logits.grad, num, atol=1e-4)

    def test_layer_norm(self):
        np.random.seed(2)
        x = Tensor(np.random.randn(4, 6), requires_grad=True)
        gamma = Tensor(np.random.randn(6), requires_grad=True)
        beta = Tensor(np.random.randn(6), requires_grad=True)

        def forward():
            return layer_norm(x, gamma, beta).sum().item()

        out = layer_norm(x, gamma, beta)
        loss = out.sum()
        loss.backward()

        num_x = numerical_grad(forward, x.data)
        num_gamma = numerical_grad(forward, gamma.data)
        np.testing.assert_allclose(x.grad, num_x, atol=1e-4)
        np.testing.assert_allclose(gamma.grad, num_gamma, atol=1e-4)

    def test_embedding_and_cat(self):
        np.random.seed(3)
        table = Tensor(np.random.randn(5, 3), requires_grad=True)
        idx = [0, 2, 2, 4]

        emb = embedding(table, idx)
        halves = [emb[:, :2], emb[:, 2:]]
        out = cat(halves, axis=-1)
        loss = out.sum()
        loss.backward()

        # row 2 is used twice, so its gradient should be double that of a
        # row used once.
        np.testing.assert_allclose(table.grad[2], 2 * table.grad[0])

    def test_softmax_masking(self):
        x = Tensor(np.array([[1.0, 2.0, 3.0]]), requires_grad=True)
        mask = np.array([[0.0, 0.0, -1e9]])
        probs = softmax(x, axis=-1, mask=mask)
        self.assertAlmostEqual(probs.data[0, 2], 0.0, places=6)


if __name__ == "__main__":
    unittest.main()
