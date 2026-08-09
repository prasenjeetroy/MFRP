"""Exercise 1: Add up the numbers from 1 to n.

Practice: `def` and a `for` loop.

Write a function `sum_to_n(n)` that returns the sum of every whole number
from 1 up to and including n.

Examples:
    sum_to_n(1)  ->  1
    sum_to_n(3)  ->  6        (1 + 2 + 3)
    sum_to_n(5)  ->  15       (1 + 2 + 3 + 4 + 5)
    sum_to_n(0)  ->  0        (nothing to add)

Hints:
    - `range(1, n + 1)` gives you 1, 2, 3, ... n.
    - Start with a variable called `total` set to 0, then add to it
      inside the loop.

Run this file to check your answer:
    python3 exercises/01_sum_to_n.py
"""


def sum_to_n(n):
    total = 0
    # TODO: loop from 1 to n and add each number to `total`
    return total


if __name__ == "__main__":
    assert sum_to_n(0) == 0, "sum_to_n(0) should be 0"
    assert sum_to_n(1) == 1, "sum_to_n(1) should be 1"
    assert sum_to_n(3) == 6, "sum_to_n(3) should be 6"
    assert sum_to_n(5) == 15, "sum_to_n(5) should be 15"
    assert sum_to_n(100) == 5050, "sum_to_n(100) should be 5050"
    print("All checks passed!")
