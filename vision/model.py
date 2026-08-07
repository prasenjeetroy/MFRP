"""A small convolutional neural network (CNN) that classifies pictures.

Architecture, in plain terms:
  conv -> relu -> pool    find simple edges and blobs, then shrink
  conv -> relu -> pool    combine those into bigger shapes, then shrink
  flatten -> fc -> relu   mix everything together
  fc                      one score per class ("cat", "dog", ...)
"""

import numpy as np

from slm.autograd import Tensor
from slm.model import Linear

from .ops import conv2d, flatten, max_pool2d


class Conv:
    def __init__(self, in_ch, out_ch, k=3, pad=1):
        fan_in = in_ch * k * k
        scale = np.sqrt(2.0 / fan_in)  # He initialization, suited to relu
        self.w = Tensor(np.random.normal(0, scale, size=(out_ch, in_ch, k, k)), requires_grad=True)
        self.b = Tensor(np.zeros(out_ch), requires_grad=True)
        self.pad = pad

    def __call__(self, x):
        return conv2d(x, self.w, self.b, pad=self.pad)

    def parameters(self):
        return [self.w, self.b]


class ImageClassifier:
    def __init__(self, num_classes, image_size=32, channels=1, width=8, hidden=32):
        self.image_size = image_size
        self.channels = channels

        self.conv1 = Conv(channels, width)
        self.conv2 = Conv(width, width * 2)

        pooled = image_size // 4  # two 2x2 pooling layers
        self.fc1 = Linear(width * 2 * pooled * pooled, hidden)
        self.fc2 = Linear(hidden, num_classes)

    def forward(self, image):
        """image: numpy array (channels, H, W) with values roughly in [0, 1]."""
        x = Tensor(image)
        x = max_pool2d(self.conv1(x).relu())
        x = max_pool2d(self.conv2(x).relu())
        x = flatten(x)
        x = self.fc1(x).relu()
        return self.fc2(x)  # logits, shape (1, num_classes)

    def parameters(self):
        return (
            self.conv1.parameters()
            + self.conv2.parameters()
            + self.fc1.parameters()
            + self.fc2.parameters()
        )

    def zero_grad(self):
        for p in self.parameters():
            p.zero_grad()

    def num_parameters(self):
        return sum(p.data.size for p in self.parameters())

    def predict(self, image):
        """Return (predicted class index, probabilities)."""
        logits = self.forward(image).data[0]
        e = np.exp(logits - logits.max())
        probs = e / e.sum()
        return int(probs.argmax()), probs
