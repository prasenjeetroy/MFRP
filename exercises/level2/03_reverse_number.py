"""Level 2, Exercise 3: Reverse a number's digits.

Practice: a `while` loop that peels a number apart with `%` and `//`.

Write a function `reverse_number(n)` that returns n with its digits in the
opposite order. Assume n is 0 or larger. Do it with arithmetic — no
`str(n)[::-1]` shortcut, the point is the loop.

Examples:
    reverse_number(1234)  ->  4321
    reverse_number(7)     ->  7
    reverse_number(100)   ->  1       (001 has no leading zeros as a number)
    reverse_number(0)     ->  0

How the maths works:
    - `n % 10` gives you the LAST digit    (1234 % 10  == 4)
    - `n // 10` chops that digit off       (1234 // 10 == 123)
    - Build the answer with
      `reversed_value = reversed_value * 10 + last_digit`,
      which shifts what you have so far one place left and drops the new
      digit into the gap.
    - Loop `while n > 0:` — and remember to shrink n each time round.

Trace it once by hand for 1234 before you write it; it makes the pattern
obvious.

Run this file to check your answer:
    python3 exercises/level2/03_reverse_number.py
"""


def reverse_number(n):
    reversed_value = 0
    # TODO: while n > 0, pull off the last digit and build it into reversed_value
    return reversed_value


if __name__ == "__main__":
    assert reverse_number(0) == 0, "0 reversed is 0"
    assert reverse_number(7) == 7, "a single digit is unchanged"
    assert reverse_number(1234) == 4321, "1234 should reverse to 4321"
    assert reverse_number(100) == 1, "trailing zeros disappear: 100 -> 1"
    assert reverse_number(120021) == 120021, "this one is a palindrome"
    print("All checks passed!")
