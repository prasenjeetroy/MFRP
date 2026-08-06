"""slm: a small language model built from scratch in Python (NumPy only)."""

from .model import SLM, GPTConfig
from .optim import Adam
from .tokenizer import CharTokenizer

__all__ = ["SLM", "GPTConfig", "Adam", "CharTokenizer"]
