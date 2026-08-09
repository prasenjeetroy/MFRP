"""Level 2, Exercise 5: Longest run of repeated characters.

Practice: carrying state through a loop — a "current" value and a "best so
far" value.

Write a function `longest_run(text)` that returns the length of the longest
stretch of the SAME character repeated next to each other.

Examples:
    longest_run("aaabbcccc")  ->  4     (the four c's)
    longest_run("abc")        ->  1     (no repeats, so the best run is 1)
    longest_run("aabbaaa")    ->  3     (the three a's at the end)
    longest_run("")           ->  0

Hints:
    - Keep two numbers: `best` (longest seen so far) and `current` (length of
      the run you are in right now).
    - Loop over the characters. If this character is the same as the previous
      one, `current` grows by 1; otherwise the run has broken, so `current`
      goes back to 1.
    - Update `best` whenever `current` is bigger than it.
    - You need the previous character to compare against. One easy way is a
      variable `previous` that you set at the end of each loop pass.
    - Watch the empty-string case: `best` should stay 0.

Run this file to check your answer:
    python3 exercises/level2/05_longest_run.py
"""


def longest_run(text):
    best = 0
    # TODO: walk through the characters, tracking the current run and the best
    return best


if __name__ == "__main__":
    assert longest_run("") == 0, "an empty string has no run"
    assert longest_run("a") == 1, "one character is a run of 1"
    assert longest_run("abc") == 1, "no repeats, so the answer is 1"
    assert longest_run("aaabbcccc") == 4, "the four c's are the longest"
    assert longest_run("aabbaaa") == 3, "the run at the END counts too"
    assert longest_run("aaab") == 3, "the run at the START counts too"
    print("All checks passed!")
