# Python Beginner Exercises: `for`, `while`, and `def`

Five small exercises to practice loops and functions. No libraries needed —
just Python 3.

## How to use these

1. Open an exercise file, e.g. `01_sum_to_n.py`.
2. Read the docstring at the top — it explains the task and shows examples.
3. Replace the `# TODO` part of the function with your own code.
4. Run the file to check your answer:

   ```bash
   python3 exercises/01_sum_to_n.py
   ```

   Every file has a few checks at the bottom. If you see
   `All checks passed!` you got it right. If not, you'll see which case failed.

5. Stuck? Peek at `solutions/` — but try for a few minutes first.

## The exercises

| File | What you practice |
| --- | --- |
| `01_sum_to_n.py` | `def` + a `for` loop with `range` |
| `02_times_table.py` | `def` + `for` + building a list |
| `03_countdown.py` | `def` + a `while` loop |
| `04_count_vowels.py` | `def` + looping over a string + `if` |
| `05_collatz_steps.py` | `def` + a `while` loop with a condition |

## Two things worth remembering

- A `for` loop is for when you know what you're looping over (a range, a list,
  a string). A `while` loop is for when you loop *until something becomes true*.
- `return` sends a value back to whoever called the function. `print` just shows
  text on screen. These exercises want you to `return` — the checks read the
  returned value.
