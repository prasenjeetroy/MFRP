"""Draw a labelled practice dataset of cat faces and dog faces.

Real photo datasets are huge, so this makes a small stand-in you can train on
in under a minute: cats get pointy triangular ears, dogs get floppy round
ears. Every picture is randomly sized, positioned, and noisy, so the model
has to learn the *shape of the ears* rather than memorize exact pixels.

    python make_dataset.py --out data/images --per-class 120

Swap in real photos later by replacing the folders — the training script
does not care where the pictures came from.
"""

import argparse
import os
import random

from PIL import Image, ImageDraw, ImageFilter


def draw_face(kind, size, rng):
    img = Image.new("L", (size, size), color=rng.randint(15, 55))
    draw = ImageDraw.Draw(img)

    r = rng.uniform(size * 0.22, size * 0.30)
    cx = size / 2 + rng.uniform(-size * 0.06, size * 0.06)
    cy = size / 2 + rng.uniform(-size * 0.02, size * 0.08)
    fur = rng.randint(150, 235)

    if kind == "cat":
        # Two upright triangles poking above the head.
        ear_h = r * rng.uniform(0.85, 1.25)
        ear_w = r * rng.uniform(0.45, 0.65)
        for side in (-1, 1):
            base_x = cx + side * r * 0.55
            draw.polygon(
                [
                    (base_x - ear_w / 2, cy - r * 0.55),
                    (base_x + ear_w / 2, cy - r * 0.55),
                    (base_x + side * ear_w * 0.15, cy - r * 0.55 - ear_h),
                ],
                fill=fur,
            )
    else:
        # Two long rounded ears hanging down the sides.
        ear_w = r * rng.uniform(0.45, 0.65)
        ear_h = r * rng.uniform(1.1, 1.6)
        for side in (-1, 1):
            ex = cx + side * r * 0.85
            draw.ellipse(
                [ex - ear_w / 2, cy - r * 0.35, ex + ear_w / 2, cy - r * 0.35 + ear_h],
                fill=fur,
            )

    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fur)

    # Eyes, so both classes share features that do NOT separate them.
    eye_r = r * 0.13
    eye_c = max(10, fur - rng.randint(90, 140))
    for side in (-1, 1):
        ex = cx + side * r * 0.38
        ey = cy - r * 0.12
        draw.ellipse([ex - eye_r, ey - eye_r, ex + eye_r, ey + eye_r], fill=eye_c)

    img = img.filter(ImageFilter.GaussianBlur(rng.uniform(0.3, 0.9)))
    px = img.load()
    for y in range(size):
        for x in range(size):
            px[x, y] = max(0, min(255, px[x, y] + rng.randint(-18, 18)))
    return img


def main():
    parser = argparse.ArgumentParser(description="Generate a labelled cat/dog practice dataset.")
    parser.add_argument("--out", default="data/images")
    parser.add_argument("--per-class", type=int, default=120)
    parser.add_argument("--size", type=int, default=64)
    parser.add_argument("--seed", type=int, default=0)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    for kind in ("cat", "dog"):
        folder = os.path.join(args.out, kind)
        os.makedirs(folder, exist_ok=True)
        for i in range(args.per_class):
            draw_face(kind, args.size, rng).save(os.path.join(folder, f"{kind}_{i:03d}.png"))
        print(f"wrote {args.per_class} pictures to {folder}")


if __name__ == "__main__":
    main()
