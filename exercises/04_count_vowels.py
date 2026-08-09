"""Exercise 4: Count the vowels in a word.

Practice: `def`, looping over a string with `for`, and `if`.

Write a function `count_vowels(text)` that returns how many vowels
(a, e, i, o, u) are in `text`. Uppercase letters count too.

Examples:
    count_vowels("hello")   ->  2
    count_vowels("Python")  ->  1
    count_vowels("AEIOU")   ->  5
    count_vowels("rhythm")  ->  0
    count_vowels("")        ->  0

Hints:
    - `for letter in text:` gives you one character at a time.
    - `text.lower()` turns "AEIOU" into "aeiou", so you only need to check
      lowercase vowels.
    - `if letter in "aeiou":` is True when letter is one of those characters.

Run this file to check your answer:
    python3 exercises/04_count_vowels.py
"""


def count_vowels(text):
    count = 0
    # TODO: loop over each letter and add 1 to `count` when it is a vowel
    return count


if __name__ == "__main__":
    assert count_vowels("hello") == 2, "'hello' has 2 vowels"
    assert count_vowels("Python") == 1, "'Python' has 1 vowel"
    assert count_vowels("AEIOU") == 5, "uppercase vowels should count too"
    assert count_vowels("rhythm") == 0, "'rhythm' has no vowels"
    assert count_vowels("") == 0, "an empty string has 0 vowels"
    print("All checks passed!")
