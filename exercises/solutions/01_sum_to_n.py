"""Solution to Exercise 1: Add up the numbers from 1 to n."""


def sum_to_n(n):
    total = 0
    for number in range(1, n + 1):
        total = total + number
    return total


if __name__ == "__main__":
    assert sum_to_n(0) == 0
    assert sum_to_n(1) == 1
    assert sum_to_n(3) == 6
    assert sum_to_n(5) == 15
    assert sum_to_n(100) == 5050
    print("All checks passed!")
