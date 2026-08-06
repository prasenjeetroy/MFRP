"""A simple character-level tokenizer."""

import json


class CharTokenizer:
    def __init__(self, text=None):
        if text is not None:
            chars = sorted(set(text))
            self.stoi = {ch: i for i, ch in enumerate(chars)}
        else:
            self.stoi = {}
        self.itos = {i: ch for ch, i in self.stoi.items()}

    @property
    def vocab_size(self):
        return len(self.stoi)

    def encode(self, s):
        return [self.stoi[ch] for ch in s]

    def decode(self, ids):
        return "".join(self.itos[i] for i in ids)

    @classmethod
    def from_stoi(cls, stoi):
        tok = cls()
        tok.stoi = dict(stoi)
        tok.itos = {int(i): ch for ch, i in tok.stoi.items()}
        return tok

    def save(self, path):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.stoi, f)

    @classmethod
    def load(cls, path):
        with open(path, encoding="utf-8") as f:
            return cls.from_stoi(json.load(f))
