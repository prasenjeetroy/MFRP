"""Solution to Level 2, Exercise 5: Longest run of repeated characters."""


def longest_run(text):
    best = 0
    current = 0
    previous = None
    for character in text:
        if character == previous:
            current = current + 1
        else:
            current = 1
        if current > best:
            best = current
        previous = character
    return best


if __name__ == "__main__":
    assert longest_run("") == 0
    assert longest_run("a") == 1
    assert longest_run("abc") == 1
    assert longest_run("aaabbcccc") == 4
    assert longest_run("aabbaaa") == 3
    assert longest_run("aaab") == 3
    print("All checks passed!")
