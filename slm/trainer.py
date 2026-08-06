"""Shared batching and training-loop helpers used by both the CLI trainer
and the interactive teaching session."""

import random


def sample_batch(data, block_size, batch_size):
    """Sample `batch_size` random (input, target) chunks of length `block_size`.

    The target is the input shifted one character to the left, so at every
    position the model is asked to predict the character that follows.
    """
    batch = []
    for _ in range(batch_size):
        start = random.randint(0, len(data) - block_size - 1)
        chunk = data[start : start + block_size + 1]
        batch.append((chunk[:-1], chunk[1:]))
    return batch


def train_steps(model, optimizer, data, block_size, batch_size, iters, on_log=None, log_every=100):
    """Run `iters` optimization steps, returning the final smoothed loss.

    `on_log(step, loss)` is called every `log_every` steps so callers can
    print progress however they like. Raising KeyboardInterrupt inside the
    loop stops training early but keeps whatever the model has learned.
    """
    running = None
    for step in range(1, iters + 1):
        batch = sample_batch(data, block_size, batch_size)

        model.zero_grad()
        total = 0.0
        for x, y in batch:
            _, loss = model.forward(x, y)
            loss.backward()
            total += loss.item()

        for p in model.parameters():
            p.grad /= len(batch)
        optimizer.step()

        avg = total / len(batch)
        running = avg if running is None else 0.95 * running + 0.05 * avg

        if on_log is not None and (step == 1 or step % log_every == 0 or step == iters):
            on_log(step, running)

    return running
