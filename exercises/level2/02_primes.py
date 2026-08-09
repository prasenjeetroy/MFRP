"""Level 2, Exercise 2: Prime numbers.

Practice: writing two functions where one calls the other, and leaving a
loop early with `return`.

Part A — `is_prime(n)` returns True if n is a prime number, False otherwise.
A prime is a whole number 2 or larger whose only divisors are 1 and itself.

    is_prime(1)  ->  False    (1 is not prime, by definition)
    is_prime(2)  ->  True
    is_prime(9)  ->  False    (9 = 3 * 3)
    is_prime(97) ->  True

Part B — `primes_up_to(limit)` returns a list of every prime from 2 up to
and including limit. Call `is_prime` from inside it; don't rewrite the logic.

    primes_up_to(10)  ->  [2, 3, 5, 7]
    primes_up_to(1)   ->  []

Hints:
    - Handle `n < 2` first: return False straight away.
    - Then loop `for divisor in range(2, n):`. If `n % divisor == 0`, n is
      NOT prime — `return False` immediately, no need to check the rest.
    - If the loop finishes without finding a divisor, `return True`. Note
      that this return goes AFTER the loop, not inside it.

Run this file to check your answer:
    python3 exercises/level2/02_primes.py
"""


def is_prime(n):
    # TODO: return False for n < 2, then look for a divisor
    return False


def primes_up_to(limit):
    primes = []
    # TODO: loop from 2 to limit and keep the numbers where is_prime is True
    return primes


if __name__ == "__main__":
    assert is_prime(1) is False, "1 is not prime"
    assert is_prime(2) is True, "2 is prime (the only even one)"
    assert is_prime(9) is False, "9 = 3 * 3, so not prime"
    assert is_prime(97) is True, "97 is prime"
    assert primes_up_to(1) == [], "no primes below 2"
    assert primes_up_to(10) == [2, 3, 5, 7], "primes up to 10 are wrong"
    assert len(primes_up_to(100)) == 25, "there are 25 primes up to 100"
    print("All checks passed!")
