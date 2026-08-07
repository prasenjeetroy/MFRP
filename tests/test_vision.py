import os
import sys
import unittest

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from slm.autograd import Tensor, cross_entropy
from tests.test_autograd import numerical_grad
from vision.model import ImageClassifier
from vision.ops import conv2d, flatten, max_pool2d


class TestVisionOps(unittest.TestCase):
    def test_conv2d_gradients(self):
        np.random.seed(0)
        x = Tensor(np.random.randn(2, 6, 6), requires_grad=True)
        w = Tensor(np.random.randn(3, 2, 3, 3), requires_grad=True)
        b = Tensor(np.random.randn(3), requires_grad=True)

        def forward():
            return conv2d(x, w, b).sum().item()

        conv2d(x, w, b).sum().backward()

        np.testing.assert_allclose(x.grad, numerical_grad(forward, x.data), atol=1e-5)
        np.testing.assert_allclose(w.grad, numerical_grad(forward, w.data), atol=1e-5)
        np.testing.assert_allclose(b.grad, numerical_grad(forward, b.data), atol=1e-5)

    def test_conv2d_nontrivial_upstream_gradient(self):
        # summing hides errors that a weighted objective exposes
        np.random.seed(1)
        x = Tensor(np.random.randn(1, 5, 5), requires_grad=True)
        w = Tensor(np.random.randn(2, 1, 3, 3), requires_grad=True)
        b = Tensor(np.zeros(2), requires_grad=True)
        weights = np.random.randn(2, 5, 5)

        def forward():
            return (conv2d(x, w, b) * Tensor(weights)).sum().item()

        (conv2d(x, w, b) * Tensor(weights)).sum().backward()
        np.testing.assert_allclose(x.grad, numerical_grad(forward, x.data), atol=1e-5)
        np.testing.assert_allclose(w.grad, numerical_grad(forward, w.data), atol=1e-5)

    def test_max_pool_gradients(self):
        np.random.seed(2)
        x = Tensor(np.random.randn(2, 4, 4), requires_grad=True)
        weights = np.random.randn(2, 2, 2)

        def forward():
            return (max_pool2d(x) * Tensor(weights)).sum().item()

        (max_pool2d(x) * Tensor(weights)).sum().backward()
        np.testing.assert_allclose(x.grad, numerical_grad(forward, x.data), atol=1e-5)

    def test_max_pool_picks_maximum(self):
        x = Tensor(np.array([[[1.0, 2.0], [3.0, 4.0]]]))
        self.assertEqual(max_pool2d(x).data[0, 0, 0], 4.0)

    def test_flatten_roundtrip(self):
        x = Tensor(np.arange(12, dtype=float).reshape(3, 2, 2), requires_grad=True)
        out = flatten(x)
        self.assertEqual(out.shape, (1, 12))
        out.sum().backward()
        np.testing.assert_allclose(x.grad, np.ones((3, 2, 2)))


class TestImageClassifier(unittest.TestCase):
    def test_forward_shape(self):
        np.random.seed(3)
        model = ImageClassifier(num_classes=2, image_size=16, width=4, hidden=8)
        logits = model.forward(np.random.rand(1, 16, 16))
        self.assertEqual(logits.shape, (1, 2))

    def test_can_learn_two_pictures(self):
        """A correct model must be able to memorize two obviously different
        images; if it cannot, the gradients are broken somewhere."""
        np.random.seed(4)
        from slm.optim import Adam

        model = ImageClassifier(num_classes=2, image_size=16, width=4, hidden=8)
        optim = Adam(model.parameters(), lr=5e-3)

        bright = np.ones((1, 16, 16)) * 0.9
        dark = np.zeros((1, 16, 16)) + 0.1
        samples = [(bright, 0), (dark, 1)]

        for _ in range(40):
            model.zero_grad()
            for img, label in samples:
                cross_entropy(model.forward(img), [label]).backward()
            for p in model.parameters():
                p.grad /= len(samples)
            optim.step()

        self.assertEqual(model.predict(bright)[0], 0)
        self.assertEqual(model.predict(dark)[0], 1)


if __name__ == "__main__":
    unittest.main()
