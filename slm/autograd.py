"""A minimal reverse-mode autograd engine over NumPy arrays.

This is the only "framework" the SLM is built on: plain NumPy for tensor
storage/math, and a small computation graph (in the spirit of micrograd)
that records how each value was produced so gradients can be propagated
back through it. No deep-learning library is used anywhere in this project.
"""

import numpy as np


def _unbroadcast(grad, shape):
    """Sum-reduce `grad` down to `shape` to undo NumPy broadcasting."""
    while grad.ndim > len(shape):
        grad = grad.sum(axis=0)
    for axis, dim in enumerate(shape):
        if dim == 1 and grad.shape[axis] != 1:
            grad = grad.sum(axis=axis, keepdims=True)
    return grad


class Tensor:
    """A NumPy array plus a gradient buffer and a backward closure."""

    def __init__(self, data, requires_grad=False, _prev=(), _op=""):
        self.data = np.asarray(data, dtype=np.float64)
        self.requires_grad = requires_grad
        self.grad = np.zeros_like(self.data)
        self._backward = lambda: None
        self._prev = set(_prev)
        self._op = _op

    @property
    def shape(self):
        return self.data.shape

    def _wrap(self, other):
        return other if isinstance(other, Tensor) else Tensor(other)

    # ---- elementwise ops ----
    def __add__(self, other):
        other = self._wrap(other)
        out = Tensor(self.data + other.data, _prev=(self, other), _op="+")

        def _backward():
            self.grad += _unbroadcast(out.grad, self.data.shape)
            other.grad += _unbroadcast(out.grad, other.data.shape)

        out._backward = _backward
        return out

    __radd__ = __add__

    def __neg__(self):
        return self * -1.0

    def __sub__(self, other):
        return self + (-self._wrap(other))

    def __rsub__(self, other):
        return self._wrap(other) + (-self)

    def __mul__(self, other):
        other = self._wrap(other)
        out = Tensor(self.data * other.data, _prev=(self, other), _op="*")

        def _backward():
            self.grad += _unbroadcast(out.grad * other.data, self.data.shape)
            other.grad += _unbroadcast(out.grad * self.data, other.data.shape)

        out._backward = _backward
        return out

    __rmul__ = __mul__

    def pow(self, exponent):
        out = Tensor(self.data ** exponent, _prev=(self,), _op=f"**{exponent}")

        def _backward():
            self.grad += (exponent * self.data ** (exponent - 1)) * out.grad

        out._backward = _backward
        return out

    def __truediv__(self, other):
        return self * self._wrap(other).pow(-1.0)

    # ---- matrix ops (2D only) ----
    def matmul(self, other):
        other = self._wrap(other)
        out = Tensor(self.data @ other.data, _prev=(self, other), _op="@")

        def _backward():
            self.grad += out.grad @ other.data.T
            other.grad += self.data.T @ out.grad

        out._backward = _backward
        return out

    def __matmul__(self, other):
        return self.matmul(other)

    def transpose(self):
        out = Tensor(self.data.T, _prev=(self,), _op="T")

        def _backward():
            self.grad += out.grad.T

        out._backward = _backward
        return out

    @property
    def T(self):
        return self.transpose()

    # ---- reductions ----
    def sum(self, axis=None, keepdims=False):
        out = Tensor(self.data.sum(axis=axis, keepdims=keepdims), _prev=(self,), _op="sum")

        def _backward():
            grad = out.grad
            if not keepdims and axis is not None:
                grad = np.expand_dims(grad, axis)
            self.grad += np.broadcast_to(grad, self.data.shape)

        out._backward = _backward
        return out

    def mean(self, axis=None, keepdims=False):
        n = self.data.size if axis is None else self.data.shape[axis]
        return self.sum(axis=axis, keepdims=keepdims) * (1.0 / n)

    # ---- activations ----
    def relu(self):
        out = Tensor(np.maximum(self.data, 0.0), _prev=(self,), _op="relu")

        def _backward():
            self.grad += (self.data > 0) * out.grad

        out._backward = _backward
        return out

    def gelu(self):
        x = self.data
        c = np.sqrt(2.0 / np.pi)
        inner = c * (x + 0.044715 * x ** 3)
        t = np.tanh(inner)
        out = Tensor(0.5 * x * (1.0 + t), _prev=(self,), _op="gelu")

        def _backward():
            dinner_dx = c * (1.0 + 3.0 * 0.044715 * x ** 2)
            sech2 = 1.0 - t ** 2
            dgelu_dx = 0.5 * (1.0 + t) + 0.5 * x * sech2 * dinner_dx
            self.grad += dgelu_dx * out.grad

        out._backward = _backward
        return out

    # ---- indexing ----
    def __getitem__(self, index):
        out = Tensor(self.data[index], _prev=(self,), _op="getitem")

        def _backward():
            np.add.at(self.grad, index, out.grad)

        out._backward = _backward
        return out

    # ---- graph traversal ----
    def backward(self):
        topo, visited = [], set()

        def build(v):
            if id(v) not in visited:
                visited.add(id(v))
                for parent in v._prev:
                    build(parent)
                topo.append(v)

        build(self)
        self.grad = np.ones_like(self.data)
        for v in reversed(topo):
            v._backward()

    def zero_grad(self):
        self.grad = np.zeros_like(self.data)

    def item(self):
        return float(self.data)

    def __repr__(self):
        return f"Tensor(shape={self.data.shape}, op={self._op!r})"


def cat(tensors, axis=-1):
    """Concatenate tensors along `axis`, splitting the gradient back on the way out."""
    datas = [t.data for t in tensors]
    out = Tensor(np.concatenate(datas, axis=axis), _prev=tuple(tensors), _op="cat")
    sizes = [d.shape[axis] for d in datas]

    def _backward():
        splits = np.split(out.grad, np.cumsum(sizes)[:-1], axis=axis)
        for t, g in zip(tensors, splits):
            t.grad += g

    out._backward = _backward
    return out


def embedding(table, idx):
    """Gather rows `idx` from an embedding table Tensor."""
    idx = np.asarray(idx)
    out = Tensor(table.data[idx], _prev=(table,), _op="embedding")

    def _backward():
        np.add.at(table.grad, idx, out.grad)

    out._backward = _backward
    return out


def softmax(t, axis=-1, mask=None):
    """Numerically stable softmax with an optional additive mask (e.g. causal -inf mask)."""
    x = t.data if mask is None else t.data + mask
    x = x - np.max(x, axis=axis, keepdims=True)
    e = np.exp(x)
    s = e / np.sum(e, axis=axis, keepdims=True)
    out = Tensor(s, _prev=(t,), _op="softmax")

    def _backward():
        g = out.grad
        dot = np.sum(g * s, axis=axis, keepdims=True)
        t.grad += s * (g - dot)

    out._backward = _backward
    return out


def cross_entropy(logits, targets):
    """Mean softmax cross-entropy loss for a (T, V) logits Tensor and integer targets (T,)."""
    targets = np.asarray(targets)
    x = logits.data - np.max(logits.data, axis=-1, keepdims=True)
    e = np.exp(x)
    probs = e / np.sum(e, axis=-1, keepdims=True)
    T = x.shape[0]
    correct = -np.log(probs[np.arange(T), targets] + 1e-12)
    out = Tensor(correct.mean(), _prev=(logits,), _op="cross_entropy")

    def _backward():
        dlogits = probs.copy()
        dlogits[np.arange(T), targets] -= 1.0
        dlogits /= T
        logits.grad += dlogits * out.grad

    out._backward = _backward
    return out


def layer_norm(x, gamma, beta, eps=1e-5):
    """Layer normalization over the last axis, with learnable scale/shift."""
    xd = x.data
    mu = xd.mean(axis=-1, keepdims=True)
    var = xd.var(axis=-1, keepdims=True)
    std_inv = 1.0 / np.sqrt(var + eps)
    xhat = (xd - mu) * std_inv
    out = Tensor(xhat * gamma.data + beta.data, _prev=(x, gamma, beta), _op="layernorm")

    def _backward():
        g = out.grad
        reduce_axes = tuple(range(xhat.ndim - 1))
        gamma.grad += np.sum(g * xhat, axis=reduce_axes) if reduce_axes else g * xhat
        beta.grad += np.sum(g, axis=reduce_axes) if reduce_axes else g

        dxhat = g * gamma.data
        mean_dxhat = dxhat.mean(axis=-1, keepdims=True)
        mean_dxhat_xhat = (dxhat * xhat).mean(axis=-1, keepdims=True)
        x.grad += std_inv * (dxhat - mean_dxhat - xhat * mean_dxhat_xhat)

    out._backward = _backward
    return out
