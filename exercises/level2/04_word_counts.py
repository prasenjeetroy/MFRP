"""Level 2, Exercise 4: Count words.

Practice: looping over a list, and using a dictionary to remember counts.

A dictionary stores pairs. `counts["cat"] = 2` means the word "cat" maps to
the number 2, and `counts["cat"]` reads it back.

Part A — `word_counts(text)` returns a dictionary mapping each word to how
many times it appears. Treat words case-insensitively.

    word_counts("the cat the")   ->  {"the": 2, "cat": 1}
    word_counts("Hi hi HI")      ->  {"hi": 3}
    word_counts("")              ->  {}

Part B — `most_common(text)` returns the single word that appears most often.
If two words tie, return whichever one appears first in the text.

    most_common("the cat the")        ->  "the"
    most_common("a b a b c")          ->  "a"    (tie with b, but a is first)
    most_common("")                   ->  None

Hints:
    - `text.lower().split()` gives you a list of lowercase words.
    - For each word: if it is already a key, add 1 to it; otherwise start it
      at 1. `if word in counts:` tests whether the key exists.
    - For Part B, walk through the words in order and keep track of the best
      word and its count so far. Only replace the best when you find a count
      that is strictly BIGGER — that is what makes ties keep the earlier word.

Run this file to check your answer:
    python3 exercises/level2/04_word_counts.py
"""


def word_counts(text):
    counts = {}
    # TODO: loop over the words and fill in `counts`
    return counts


def most_common(text):
    # TODO: return the most frequent word, or None if there are no words
    return None


if __name__ == "__main__":
    assert word_counts("") == {}, "no words means an empty dictionary"
    assert word_counts("the cat the") == {"the": 2, "cat": 1}, "counts are wrong"
    assert word_counts("Hi hi HI") == {"hi": 3}, "case should be ignored"
    assert most_common("") is None, "no words means None"
    assert most_common("the cat the") == "the", "'the' appears twice"
    assert most_common("a b a b c") == "a", "on a tie, keep the earlier word"
    assert most_common("one") == "one", "a single word is the most common"
    print("All checks passed!")
