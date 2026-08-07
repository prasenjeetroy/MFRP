# How to build an AI model from scratch

A walkthrough of what is actually in this repo and why, written for someone
who has never built a model before. Every idea here is implemented in code
you can open and read.

---

## Part 0: two corrections worth knowing early

**HTML cannot build or train a model.** HTML describes what a web page looks
like — headings, buttons, images. It contains no maths and cannot learn
anything. You *can* build a web page that sends a picture to a trained model
and shows the answer, but the model itself has to be real code. Everything in
this repo is Python.

**One model cannot do both text and pictures** (not at this size, anyway).
A model that reads characters has no concept of a pixel. That is why this
repo has *two* models sharing one engine:

| | `slm/` | `vision/` |
|---|---|---|
| reads | characters | pixels |
| answers | "what letter comes next?" | "which label is this?" |
| called | language model | image classifier (CNN) |
| trained by | `teach.py`, `train.py` | `train_images.py` |

Both are built on the same hand-written autograd engine in
`slm/autograd.py`. That engine is the real "AI from scratch" part.

---

## Part 1: the five pieces every model needs

Whatever you are building, it is always these five things:

1. **Data** — examples to learn from.
2. **A way to turn data into numbers** — models only do arithmetic.
3. **The model** — a big pile of adjustable numbers ("parameters") that turn
   input numbers into an answer.
4. **A loss** — one number saying how wrong the answer was.
5. **An optimizer** — a rule for nudging every parameter to make the loss
   smaller next time.

Then you loop: guess → measure wrongness → nudge → repeat, thousands of times.
That loop *is* training. There is nothing else to it.

---

## Part 2: how the learning actually happens (backpropagation)

This is the one genuinely clever idea, and it lives in `slm/autograd.py`.

When the model computes an answer, it does thousands of small steps
(multiply, add, etc.). The engine secretly writes down every step, building a
list of what depended on what. That list is the **computation graph**.

When you then ask "how wrong were we?", the engine walks that list
**backwards**, and at each step applies the chain rule from calculus to work
out: *if I nudged this particular number up a little, would the wrongness go
up or down, and by how much?*

That answer, for every parameter, is the **gradient**. The optimizer then
moves each parameter a small step in the direction that reduces wrongness.

In the code:
- `Tensor` (in `slm/autograd.py`) holds a number-array plus its gradient.
- Each operation stores a `_backward()` closure saying how to pass gradient
  to its inputs.
- `Tensor.backward()` walks the whole graph in reverse and fills in every
  gradient.
- `Adam` (in `slm/optim.py`) does the nudging.

**How do you know your maths is right?** You check gradients numerically:
nudge one number by a tiny amount, see how much the loss really changed, and
compare that to what your backward pass claimed. If they disagree, your
gradients are wrong and the model will never learn properly. That is exactly
what `tests/test_autograd.py` and `tests/test_vision.py` do. **Write these
tests first** — a broken gradient produces a model that trains "fine" and
learns nothing, which is miserable to debug.

---

## Part 3: building the text model, step by step

1. **Collect text.** Anything: stories, song lyrics, your own writing.
2. **Tokenize it** (`slm/tokenizer.py`). List every distinct character and
   give each a number. `"cat"` → `[12, 3, 25]`.
3. **Embed** (`slm/model.py`). Turn each character-number into a list of ~64
   numbers that the model can shape into a "meaning". These start random.
4. **Attention** (`CausalSelfAttention`). Before predicting the next
   character, let the model look back at earlier characters and weigh which
   ones matter. A *causal* mask stops it peeking at the answer.
5. **Stack blocks.** Attention + a small feed-forward network, repeated. Each
   layer builds on the last.
6. **Predict.** A final layer produces one score per possible character.
7. **Loss.** Cross-entropy compares those scores to the true next character.
8. **Train.** Loop steps 3-7 thousands of times.
9. **Generate.** Feed in a prompt, take the model's guess, append it, feed it
   back in, repeat.

Run it: `python teach.py`

---

## Part 4: building the picture model, step by step

The big difference: pixels next to each other are related, so we look at
small square patches instead of single values.

1. **Collect labelled pictures.** One folder per label. The folder name *is*
   the answer:
   ```
   data/images/cat/*.png
   data/images/dog/*.png
   ```
   This is what "labelled data" means — the correct answer is attached to
   each example, so training can mark its own homework.
2. **Load and normalize** (`vision/data.py`). Resize everything to 32×32,
   convert to grey, scale pixels to 0-1. Models want consistent input.
3. **Hold some back.** `train_val_split` reserves ~20% the model never trains
   on. Without this you cannot tell learning from memorizing.
4. **Convolution** (`vision/ops.py`). Slide small filters (3×3) over the
   image. Early filters learn edges; later ones combine those into shapes
   like "pointy ear". Implemented via `im2col`, which lays every patch out as
   a row so the convolution becomes one matrix multiply.
5. **Pooling** (`max_pool2d`). Keep the strongest value in each 2×2 block.
   Halves the size and makes the model tolerant of things shifting slightly.
6. **Flatten and classify.** Stretch the feature maps into one row, then two
   ordinary layers produce one score per label.
7. **Loss + train.** Same cross-entropy, same Adam, same loop as the text
   model.
8. **Augment** (`vision/data.py`). Randomly flip/shift/brighten each picture
   during training. It teaches the model that a cat is still a cat when it
   moves — the cheapest way to get more out of few pictures.

Run it:
```bash
python make_dataset.py --out data/images --per-class 120   # practice pictures
python train_images.py --data data/images --epochs 12
python predict_image.py --model image_model.pkl --image somepicture.png
```

To use **real** cat and dog photos, just replace the contents of
`data/images/cat/` and `data/images/dog/` and run the same command. Expect
much lower accuracy — see below.

---

## Part 5: how to train it better

Ordered by how much difference they make.

**1. More and more varied data.** This dominates everything else. A model
can only learn patterns that appear in its data. If `2 + 2 = 4` is the only
sum it ever sees, it learns that exact line, not addition.

**2. Watch the gap between seen and unseen scores.** The training script
prints both:
```
epoch 12/12  loss 0.0063  train 100.0%  unseen 100.0%
```
- Both low/bad → **underfitting**: train longer, or make the model bigger.
- `train` great, `unseen` poor → **overfitting** (memorizing): get more data,
  turn on augmentation, or make the model smaller.
- Both good → genuinely learning. This is the goal.

**3. Learning rate.** The single most important knob. Too high and the loss
jumps around or explodes; too low and it crawls. Try 3e-3, 1e-3, 3e-4 and
keep whichever falls fastest.

**4. Train longer, but stop when `unseen` stops improving.** After that point
you are just memorizing.

**5. Size the model to the data.** More layers/width only helps if you have
enough examples to justify them. With 200 pictures, a small model beats a big
one.

**6. Augmentation** (pictures) — flips and shifts multiply your effective
dataset for free. On by default; disable with `--no-augment`.

---

## Part 6: honest expectations

The synthetic cat/dog set in this repo reaches 100% because pointy ears
versus floppy ears is a clean, deliberately learnable difference.

**Real photographs are far harder.** Real cats and dogs vary in colour, pose,
lighting, background and breed. With a few hundred photos and this small
model, expect roughly 60-75% accuracy, not 100%. Getting to ~95% on real
photos needs either tens of thousands of images, or *transfer learning*
(starting from a model someone else already trained on millions of pictures).

That is not a flaw in this code — it is what the problem actually costs.

---

## Part 7: where to go next

1. Train the text model on something you like and watch it imitate the style.
2. Add a third label to the pictures (`data/images/bird/`) — the code handles
   any number of classes automatically, no edits needed.
3. Read `slm/autograd.py` line by line. It is under 300 lines and it is the
   entire engine.
4. Add a new operation and gradient-check it, the way `vision/ops.py` does.
5. Once this makes sense, move to PyTorch — it is the same ideas with fast
   GPU kernels and far more operations, and you will now understand what it
   is doing underneath instead of copying tutorials.
