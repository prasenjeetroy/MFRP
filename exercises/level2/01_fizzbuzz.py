"""Level 2, Exercise 1: FizzBuzz.

Practice: `def`, a `for` loop, and choosing between several cases with
`if` / `elif` / `else`.

Write a function `fizzbuzz(n)` that returns a list with one entry for each
number from 1 to n:
    - "FizzBuzz" if the number divides by both 3 and 5
    - "Fizz"     if it divides by 3
    - "Buzz"     if it divides by 5
    - otherwise the number itself, as text: "1", "2", "4", ...

Examples:
    fizzbuzz(5)   ->  ["1", "2", "Fizz", "4", "Buzz"]
    fizzbuzz(1)   ->  ["1"]
    fizzbuzz(0)   ->  []
    fizzbuzz(15)[14]  ->  "FizzBuzz"

Hints:
    - `number % 3 == 0` is True when number divides evenly by 3.
    - Check the "both" case FIRST. If you check `% 3` first, 15 becomes
      "Fizz" and you never reach the FizzBuzz branch — that is the whole
      trick of this exercise.
    - `str(number)` turns 4 into "4".

Run this file to check your answer:
    python3 exercises/level2/01_fizzbuzz.py
"""


def fizzbuzz(n):
    results = []
    # TODO: loop from 1 to n and append the right text for each number
    return results


if __name__ == "__main__":
    assert fizzbuzz(0) == [], "fizzbuzz(0) should be an empty list"
    assert fizzbuzz(1) == ["1"], "1 is not divisible by 3 or 5"
    assert fizzbuzz(5) == ["1", "2", "Fizz", "4", "Buzz"], "first five are wrong"
    assert fizzbuzz(15)[14] == "FizzBuzz", "15 should be FizzBuzz, not Fizz"
    assert len(fizzbuzz(100)) == 100, "should have one entry per number"
    assert fizzbuzz(100).count("Fizz") == 27, "27 numbers up to 100 are Fizz only"
    assert fizzbuzz(100).count("Buzz") == 14, "14 numbers up to 100 are Buzz only"
    print("All checks passed!")
