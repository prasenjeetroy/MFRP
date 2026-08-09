"""Solution to Exercise 5: How many steps to reach 1?"""


def collatz_steps(n):
    steps = 0
    while n != 1:
        if n % 2 == 0:
            n = n // 2
        else:
            n = 3 * n + 1
        steps = steps + 1
    return steps


if __name__ == "__main__":
    assert collatz_steps(1) == 0
    assert collatz_steps(2) == 1
    assert collatz_steps(3) == 7
    assert collatz_steps(6) == 8
    assert collatz_steps(27) == 111
    print("All checks passed!")
