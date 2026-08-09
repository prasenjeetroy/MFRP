"""Solution to Exercise 4: Count the vowels in a word."""


def count_vowels(text):
    count = 0
    for letter in text.lower():
        if letter in "aeiou":
            count = count + 1
    return count


if __name__ == "__main__":
    assert count_vowels("hello") == 2
    assert count_vowels("Python") == 1
    assert count_vowels("AEIOU") == 5
    assert count_vowels("rhythm") == 0
    assert count_vowels("") == 0
    print("All checks passed!")
