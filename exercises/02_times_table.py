"""Exercise 2: Build a multiplication table.

Practice: `def`, a `for` loop, and building a list.

Write a function `times_table(number, up_to)` that returns a list of the
first `up_to` multiples of `number`.

Examples:
    times_table(3, 5)   ->  [3, 6, 9, 12, 15]
    times_table(7, 3)   ->  [7, 14, 21]
    times_table(10, 1)  ->  [10]
    times_table(4, 0)   ->  []

Hints:
    - Start with an empty list: `results = []`
    - `results.append(x)` adds x to the end of the list.
    - Loop with `for i in range(1, up_to + 1)` so i goes 1, 2, 3, ...

Run this file to check your answer:
    python3 exercises/02_times_table.py
"""


def times_table(number, up_to):
    results = []
    # TODO: append number * 1, number * 2, ... number * up_to to `results`
    return results


if __name__ == "__main__":
    assert times_table(3, 5) == [3, 6, 9, 12, 15], "3 times table is wrong"
    assert times_table(7, 3) == [7, 14, 21], "7 times table is wrong"
    assert times_table(10, 1) == [10], "should return a list with one item"
    assert times_table(4, 0) == [], "up_to of 0 should give an empty list"
    print("All checks passed!")

    # Bonus: once the checks pass, print a nice table for 6.
    for value in times_table(6, 10):
        print(value)
