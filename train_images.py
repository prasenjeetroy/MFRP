"""Train the image classifier on labelled picture folders.

Put your pictures in one folder per label, then run:

    python train_images.py --data data/images --epochs 20

    data/images/
        cat/  ...jpg
        dog/  ...jpg
"""

import argparse
import pickle
import random

import numpy as np

from slm.autograd import cross_entropy
from slm.optim import Adam
from vision.data import augment, load_dataset, train_val_split
from vision.model import ImageClassifier


def accuracy(model, images, labels):
    correct = sum(model.predict(img)[0] == label for img, label in zip(images, labels))
    return correct / len(images)


def main():
    parser = argparse.ArgumentParser(description="Train a picture classifier from scratch.")
    parser.add_argument("--data", default="data/images", help="folder containing one subfolder per label")
    parser.add_argument("--out", default="image_model.pkl")
    parser.add_argument("--size", type=int, default=32, help="images are resized to size x size")
    parser.add_argument("--channels", type=int, default=1, choices=[1, 3], help="1=grayscale, 3=color")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--lr", type=float, default=2e-3)
    parser.add_argument("--width", type=int, default=8, help="number of filters in the first conv layer")
    parser.add_argument("--hidden", type=int, default=32)
    parser.add_argument("--val-fraction", type=float, default=0.2)
    parser.add_argument("--no-augment", action="store_true", help="turn off flips/shifts")
    parser.add_argument("--seed", type=int, default=0)
    args = parser.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)
    rng = random.Random(args.seed)

    images, labels, class_names = load_dataset(args.data, size=args.size, channels=args.channels)
    (train_x, train_y), (val_x, val_y) = train_val_split(
        images, labels, val_fraction=args.val_fraction, seed=args.seed
    )
    print(f"classes: {class_names}")
    print(f"{len(train_x)} pictures to learn from, {len(val_x)} held back for testing")

    model = ImageClassifier(
        num_classes=len(class_names),
        image_size=args.size,
        channels=args.channels,
        width=args.width,
        hidden=args.hidden,
    )
    optimizer = Adam(model.parameters(), lr=args.lr)
    print(f"model has {model.num_parameters():,} parameters\n")

    order = list(range(len(train_x)))
    for epoch in range(1, args.epochs + 1):
        rng.shuffle(order)
        total_loss = 0.0

        for start in range(0, len(order), args.batch_size):
            batch = order[start : start + args.batch_size]
            model.zero_grad()
            for i in batch:
                img = train_x[i] if args.no_augment else augment(train_x[i], rng)
                logits = model.forward(img)
                loss = cross_entropy(logits, [train_y[i]])
                loss.backward()
                total_loss += loss.item()
            for p in model.parameters():
                p.grad /= len(batch)
            optimizer.step()

        train_acc = accuracy(model, train_x, train_y)
        val_acc = accuracy(model, val_x, val_y)
        print(
            f"epoch {epoch:3d}/{args.epochs}  loss {total_loss / len(order):.4f}  "
            f"train {train_acc:5.1%}  unseen {val_acc:5.1%}"
        )

    with open(args.out, "wb") as f:
        pickle.dump(
            {
                "class_names": class_names,
                "size": args.size,
                "channels": args.channels,
                "width": args.width,
                "hidden": args.hidden,
                "params": [p.data for p in model.parameters()],
            },
            f,
        )
    print(f"\nsaved to {args.out}")


if __name__ == "__main__":
    main()
