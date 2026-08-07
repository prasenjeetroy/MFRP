# MFRP
MyFirstRealSFDCProject

## AI models built from scratch in Python

Two working models — a **text model** and an **image classifier** — built
from first principles on a single hand-written autograd engine. NumPy for
array math only; no PyTorch, TensorFlow, or other ML framework.

New to this? Start with **[LEARN.md](LEARN.md)** — a step-by-step guide to
how a model is built and trained, written for beginners.

| | `slm/` (text) | `vision/` (pictures) |
|---|---|---|
| reads | characters | pixels |
| answers | "what comes next?" | "which label is this?" |
| train with | `teach.py`, `train.py` | `train_images.py` |

### The text model

### Layout

- `slm/autograd.py` — minimal `Tensor` class with a hand-written computation
  graph and backward pass (add, mul, matmul, softmax, layer norm, cross
  entropy, embeddings, etc.)
- `slm/model.py` — the SLM itself: token + positional embeddings, causal
  multi-head self-attention, MLP blocks, layer norm, and an output head.
- `slm/optim.py` — a small Adam optimizer.
- `slm/tokenizer.py` — a character-level tokenizer.
- `slm/trainer.py` — batching and the shared training loop.
- `teach.py` — **interactive session**: type your own text, train, and ask the
  model to write something back, all from one prompt.
- `train.py` — trains the model on a text file.
- `generate.py` — generates text from a trained checkpoint.
- `data/corpus.txt` — a small sample training text.
- `vision/ops.py` — convolution, max pooling and flatten, with hand-written
  gradients, built on the same autograd engine.
- `vision/model.py` — the CNN image classifier.
- `vision/data.py` — loading labelled image folders, train/validation split,
  and augmentation.
- `make_dataset.py` — draws a labelled cat/dog practice dataset.
- `train_images.py` — trains the image classifier.
- `predict_image.py` — classifies a picture with a trained model.
- `tests/` — numerical gradient checks for every operation, plus sanity tests
  that both models actually learn.

### Usage

#### Interactive: type your own training text

```bash
pip install -r requirements.txt
python teach.py
```

You get a prompt with these commands:

| command  | what it does |
| -------- | ------------ |
| `teach`  | type or paste text for the model to learn from (blank line to finish) |
| `file`   | load training text from a `.txt` file instead of typing it |
| `train`  | practice on everything taught so far (Ctrl-C stops early, keeping progress) |
| `write`  | give it a starting phrase and watch it continue |
| `status` | how much text it has seen, how much it has practiced, current loss |
| `save`   | save the model so you can pick up later with `python teach.py --load mymodel.pkl` |
| `quit`   | leave |

You can keep teaching it new text between training rounds. If the new text
contains characters it has never seen, the vocabulary and the model grow to
fit them without losing anything already learned.

#### Non-interactive: train from a file

```bash
# Train on the sample corpus (or point --data at your own text file)
python train.py --data data/corpus.txt --iters 2000 --out checkpoint.pkl

# Generate text from the trained model
python generate.py --checkpoint checkpoint.pkl --prompt "The small" --length 300
```

### The image classifier

Sort your pictures into one folder per label — the folder name is the label:

```
data/images/
    cat/   anything.png
    dog/   anything.jpg
```

```bash
# Draw a practice dataset (or skip this and use your own photos)
python make_dataset.py --out data/images --per-class 120

# Train. Prints accuracy on pictures it trained on AND ones held back.
python train_images.py --data data/images --epochs 12

# Ask it about a picture
python predict_image.py --model image_model.pkl --image mypicture.png
```

Adding a third label is just adding a third folder — no code changes.

On the drawn practice set this reaches 100% on unseen pictures in about
20 seconds. Real photographs are much harder; see the "honest expectations"
section of [LEARN.md](LEARN.md).

### Tests

Every hand-written gradient is checked against a numerical estimate, which is
what catches the silent bugs that would otherwise let a model "train" while
learning nothing:

```bash
python -m unittest discover -s tests
```

This is a small, from-scratch model meant for learning/demonstration — it
trains one sequence at a time in pure Python/NumPy, so it's best used with
modest hyperparameters and small-to-medium text corpora.
