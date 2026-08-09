"""Solution to Level 2, Exercise 3: Reverse a number's digits."""


def reverse_number(n):
    reversed_value = 0
    while n > 0:
        last_digit = n % 10
        reversed_value = reversed_value * 10 + last_digit
        n = n // 10
    return reversed_value


if __name__ == "__main__":
    assert reverse_number(0) == 0
    assert reverse_number(7) == 7
    assert reverse_number(1234) == 4321
    assert reverse_number(100) == 1
    assert reverse_number(120021) == 120021
    print("All checks passed!")
