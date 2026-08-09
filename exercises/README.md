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

## Level 1 — the basics

| File | What you practice |
| --- | --- |
| `01_sum_to_n.py` | `def` + a `for` loop with `range` |
| `02_times_table.py` | `def` + `for` + building a list |
| `03_countdown.py` | `def` + a `while` loop |
| `04_count_vowels.py` | `def` + looping over a string + `if` |
| `05_collatz_steps.py` | `def` + a `while` loop with a condition |

## Level 2 — a step up (`level2/`)

Same loops and functions, but each one asks you to hold a bit more in your
head: several branches, one function calling another, or a variable you carry
along as the loop runs.

| File | What you practice |
| --- | --- |
| `level2/01_fizzbuzz.py` | `if` / `elif` / `else` inside a loop, and branch order |
| `level2/02_primes.py` | Two functions, one calling the other; leaving a loop early with `return` |
| `level2/03_reverse_number.py` | A `while` loop doing arithmetic with `%` and `//` |
| `level2/04_word_counts.py` | Dictionaries — counting things as you loop |
| `level2/05_longest_run.py` | Tracking "current" and "best so far" through a loop |

Level 2 works exactly the same way — fill in the `# TODO`, run the file,
answers in `level2/solutions/`.

## Two things worth remembering

- A `for` loop is for when you know what you're looping over (a range, a list,
  a string). A `while` loop is for when you loop *until something becomes true*.
- `return` sends a value back to whoever called the function. `print` just shows
  text on screen. These exercises want you to `return` — the checks read the
  returned value.
