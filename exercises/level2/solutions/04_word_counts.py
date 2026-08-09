"""Solution to Level 2, Exercise 4: Count words."""


def word_counts(text):
    counts = {}
    for word in text.lower().split():
        if word in counts:
            counts[word] = counts[word] + 1
        else:
            counts[word] = 1
    return counts


def most_common(text):
    counts = word_counts(text)
    best_word = None
    best_count = 0
    for word in text.lower().split():
        if counts[word] > best_count:
            best_word = word
            best_count = counts[word]
    return best_word


if __name__ == "__main__":
    assert word_counts("") == {}
    assert word_counts("the cat the") == {"the": 2, "cat": 1}
    assert word_counts("Hi hi HI") == {"hi": 3}
    assert most_common("") is None
    assert most_common("the cat the") == "the"
    assert most_common("a b a b c") == "a"
    assert most_common("one") == "one"
    print("All checks passed!")
