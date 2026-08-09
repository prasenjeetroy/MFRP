"""Solution to Level 2, Exercise 2: Prime numbers."""


def is_prime(n):
    if n < 2:
        return False
    for divisor in range(2, n):
        if n % divisor == 0:
            return False
    return True


def primes_up_to(limit):
    primes = []
    for number in range(2, limit + 1):
        if is_prime(number):
            primes.append(number)
    return primes


if __name__ == "__main__":
    assert is_prime(1) is False
    assert is_prime(2) is True
    assert is_prime(9) is False
    assert is_prime(97) is True
    assert primes_up_to(1) == []
    assert primes_up_to(10) == [2, 3, 5, 7]
    assert len(primes_up_to(100)) == 25
    print("All checks passed!")
