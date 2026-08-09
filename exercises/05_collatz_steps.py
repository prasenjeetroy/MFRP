"""Exercise 5: How many steps to reach 1?

Practice: `def` and a `while` loop that runs until a condition is met.

Start with any positive whole number and follow these two rules over and over:
    - if the number is even, halve it
    - if the number is odd, multiply by 3 and add 1
Eventually you always reach 1.

Write a function `collatz_steps(n)` that returns how many steps it takes to
get from `n` down to 1.

Examples:
    collatz_steps(1)  ->  0    (already 1, no steps needed)
    collatz_steps(2)  ->  1    (2 -> 1)
    collatz_steps(3)  ->  7    (3 -> 10 -> 5 -> 16 -> 8 -> 4 -> 2 -> 1)
    collatz_steps(6)  ->  8

Hints:
    - Loop `while n != 1:` and count each time round.
    - `n % 2 == 0` is True when n is even.
    - Use `n = n // 2` (two slashes) to halve it — that keeps it a whole
      number, while a single `/` would give 3.0 instead of 3.

Run this file to check your answer:
    python3 exercises/05_collatz_steps.py
"""


def collatz_steps(n):
    steps = 0
    # TODO: while n is not 1, apply the even/odd rule and count the step
    return steps


if __name__ == "__main__":
    assert collatz_steps(1) == 0, "1 needs no steps"
    assert collatz_steps(2) == 1, "2 -> 1 is one step"
    assert collatz_steps(3) == 7, "3 should take 7 steps"
    assert collatz_steps(6) == 8, "6 should take 8 steps"
    assert collatz_steps(27) == 111, "27 should take 111 steps"
    print("All checks passed!")
