"""Image-specific autograd operations: convolution, max pooling, flatten.

These plug into the same hand-written autograd engine as the language model
(`slm.autograd`), so gradients flow through pictures exactly the way they
flow through text. NumPy only — no deep-learning library.
"""

import numpy as np

from slm.autograd import Tensor


def _im2col(x, k, pad, stride):
    """Lay every k x k patch of the image out as a row of a matrix.

    This is the trick that turns a convolution into a plain matrix multiply:
    once the patches are rows, "slide the filter over the image" becomes
    "multiply by the filter once".
    """
    C, H, W = x.shape
    xp = np.pad(x, ((0, 0), (pad, pad), (pad, pad)))
    out_h = (H + 2 * pad - k) // stride + 1
    out_w = (W + 2 * pad - k) // stride + 1

    cols = np.empty((out_h * out_w, C * k * k))
    row = 0
    for i in range(out_h):
        for j in range(out_w):
            patch = xp[:, i * stride : i * stride + k, j * stride : j * stride + k]
            cols[row] = patch.reshape(-1)
            row += 1
    return cols, out_h, out_w


def _col2im(cols, x_shape, k, pad, stride, out_h, out_w):
    """The reverse of _im2col: scatter patch gradients back onto the image."""
    C, H, W = x_shape
    xp_grad = np.zeros((C, H + 2 * pad, W + 2 * pad))
    row = 0
    for i in range(out_h):
        for j in range(out_w):
            patch = cols[row].reshape(C, k, k)
            xp_grad[:, i * stride : i * stride + k, j * stride : j * stride + k] += patch
            row += 1
    return xp_grad[:, pad : pad + H, pad : pad + W] if pad else xp_grad


def conv2d(x, weight, bias, pad=1, stride=1):
    """2-D convolution over one image.

    x:      Tensor (C_in, H, W)
    weight: Tensor (C_out, C_in, k, k)
    bias:   Tensor (C_out,)
    returns Tensor (C_out, H_out, W_out)
    """
    C_out, C_in, k, _ = weight.data.shape
    cols, out_h, out_w = _im2col(x.data, k, pad, stride)
    w_mat = weight.data.reshape(C_out, -1)

    out_mat = cols @ w_mat.T + bias.data
    out = Tensor(
        out_mat.T.reshape(C_out, out_h, out_w),
        _prev=(x, weight, bias),
        _op="conv2d",
    )

    def _backward():
        g_mat = out.grad.reshape(C_out, -1).T          # (positions, C_out)
        bias.grad += g_mat.sum(axis=0)
        weight.grad += (g_mat.T @ cols).reshape(weight.data.shape)
        d_cols = g_mat @ w_mat                          # (positions, C_in*k*k)
        x.grad += _col2im(d_cols, x.data.shape, k, pad, stride, out_h, out_w)

    out._backward = _backward
    return out


def max_pool2d(x, k=2):
    """Shrink the image by keeping only the strongest value in each k x k block."""
    C, H, W = x.data.shape
    H_out, W_out = H // k, W // k
    cropped = x.data[:, : H_out * k, : W_out * k]

    blocks = cropped.reshape(C, H_out, k, W_out, k).transpose(0, 1, 3, 2, 4)
    flat = blocks.reshape(C, H_out, W_out, k * k)
    argmax = flat.argmax(axis=-1)
    out = Tensor(flat.max(axis=-1), _prev=(x,), _op="max_pool2d")

    def _backward():
        mask = np.zeros_like(flat)
        ci, hi, wi = np.indices((C, H_out, W_out))
        mask[ci, hi, wi, argmax] = out.grad
        unpooled = mask.reshape(C, H_out, W_out, k, k).transpose(0, 1, 3, 2, 4)
        x.grad[:, : H_out * k, : W_out * k] += unpooled.reshape(C, H_out * k, W_out * k)

    out._backward = _backward
    return out


def flatten(x):
    """Turn the (C, H, W) stack of feature maps into one long row (1, C*H*W)."""
    shape = x.data.shape
    out = Tensor(x.data.reshape(1, -1), _prev=(x,), _op="flatten")

    def _backward():
        x.grad += out.grad.reshape(shape)

    out._backward = _backward
    return out
