"""Loading labelled image folders.

Expected layout — one folder per label, any name you like:

    data/images/
        cat/  cat1.png  cat2.png  ...
        dog/  dog1.png  dog2.png  ...

The folder name *is* the label. That is what "labelled data" means: the
answer is stored in the file's location, so training can check its guesses.
"""

import os
import random

import numpy as np
from PIL import Image

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".gif", ".webp"}


def load_image(path, size=32, channels=1):
    """Read one picture and turn it into numbers the model can use."""
    img = Image.open(path)
    img = img.convert("L" if channels == 1 else "RGB")
    img = img.resize((size, size), Image.BILINEAR)
    arr = np.asarray(img, dtype=np.float64) / 255.0
    if channels == 1:
        arr = arr[None, :, :]           # (1, H, W)
    else:
        arr = arr.transpose(2, 0, 1)    # (3, H, W)
    return arr


def load_dataset(root, size=32, channels=1):
    """Load every image under `root`, using each subfolder name as the label.

    Returns (images, labels, class_names).
    """
    class_names = sorted(
        d for d in os.listdir(root) if os.path.isdir(os.path.join(root, d))
    )
    if not class_names:
        raise ValueError(f"no label folders found inside {root}")

    images, labels = [], []
    for label_idx, name in enumerate(class_names):
        folder = os.path.join(root, name)
        files = sorted(
            f for f in os.listdir(folder) if os.path.splitext(f)[1].lower() in IMAGE_EXTS
        )
        if not files:
            raise ValueError(f"folder {folder} has no images in it")
        for fname in files:
            images.append(load_image(os.path.join(folder, fname), size, channels))
            labels.append(label_idx)

    return images, labels, class_names


def train_val_split(images, labels, val_fraction=0.2, seed=0):
    """Hold some pictures back so we can test on ones never trained on.

    Without this you cannot tell learning apart from memorizing.
    """
    idx = list(range(len(images)))
    random.Random(seed).shuffle(idx)
    n_val = max(1, int(len(idx) * val_fraction))
    val_idx, train_idx = idx[:n_val], idx[n_val:]

    take = lambda ids: ([images[i] for i in ids], [labels[i] for i in ids])
    return take(train_idx), take(val_idx)


def augment(image, rng):
    """Make a slightly changed copy of a picture: flip, shift, brightness.

    Showing the model many small variations of the same photo teaches it
    that a cat is still a cat when it moves or the light changes — the
    cheapest way to get more out of a small set of pictures.
    """
    out = image
    if rng.random() < 0.5:
        out = out[:, :, ::-1]
    shift_y, shift_x = rng.randint(-3, 3), rng.randint(-3, 3)
    out = np.roll(np.roll(out, shift_y, axis=1), shift_x, axis=2)
    if rng.random() < 0.3:
        out = np.clip(out * rng.uniform(0.8, 1.2), 0.0, 1.0)
    return np.ascontiguousarray(out)
