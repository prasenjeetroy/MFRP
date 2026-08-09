"""Exercise 3: Count down to zero.

Practice: `def` and a `while` loop.

Write a function `countdown(start)` that returns a list counting down from
`start` all the way to 0.

Examples:
    countdown(3)  ->  [3, 2, 1, 0]
    countdown(1)  ->  [1, 0]
    countdown(0)  ->  [0]

Hints:
    - Keep a variable, e.g. `current = start`.
    - Loop `while current >= 0:` and append `current` each time.
    - Don't forget to make `current` smaller inside the loop
      (`current = current - 1`), or the loop will never stop!

If your program hangs forever, press Ctrl+C to stop it — that usually means
the while loop's condition never became False.

Run this file to check your answer:
    python3 exercises/03_countdown.py
"""


def countdown(start):
    numbers = []
    current = start
    # TODO: use a while loop to append current, then decrease it by 1
    return numbers


if __name__ == "__main__":
    assert countdown(3) == [3, 2, 1, 0], "countdown(3) should be [3, 2, 1, 0]"
    assert countdown(1) == [1, 0], "countdown(1) should be [1, 0]"
    assert countdown(0) == [0], "countdown(0) should be [0]"
    assert len(countdown(10)) == 11, "countdown(10) should have 11 numbers"
    print("All checks passed!")
