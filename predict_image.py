"""Ask the trained image model what it sees in a picture.

    python predict_image.py --model image_model.pkl --image somecat.png
"""

import argparse
import pickle

from vision.data import load_image
from vision.model import ImageClassifier


def load_model(path):
    with open(path, "rb") as f:
        ckpt = pickle.load(f)
    model = ImageClassifier(
        num_classes=len(ckpt["class_names"]),
        image_size=ckpt["size"],
        channels=ckpt["channels"],
        width=ckpt["width"],
        hidden=ckpt["hidden"],
    )
    for p, data in zip(model.parameters(), ckpt["params"]):
        p.data = data
    return model, ckpt


def main():
    parser = argparse.ArgumentParser(description="Classify a picture.")
    parser.add_argument("--model", default="image_model.pkl")
    parser.add_argument("--image", required=True, nargs="+", help="one or more image files")
    args = parser.parse_args()

    model, ckpt = load_model(args.model)

    for path in args.image:
        img = load_image(path, size=ckpt["size"], channels=ckpt["channels"])
        idx, probs = model.predict(img)
        ranked = sorted(zip(ckpt["class_names"], probs), key=lambda kv: -kv[1])
        detail = "  ".join(f"{name} {p:.0%}" for name, p in ranked)
        print(f"{path}\n  -> {ckpt['class_names'][idx].upper()}   ({detail})")


if __name__ == "__main__":
    main()
