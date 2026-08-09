"""Solution to Exercise 3: Count down to zero."""


def countdown(start):
    numbers = []
    current = start
    while current >= 0:
        numbers.append(current)
        current = current - 1
    return numbers


if __name__ == "__main__":
    assert countdown(3) == [3, 2, 1, 0]
    assert countdown(1) == [1, 0]
    assert countdown(0) == [0]
    assert len(countdown(10)) == 11
    print("All checks passed!")
