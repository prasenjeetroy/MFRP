"""Number theory: primes, factorization, modular arithmetic and sequences.

    >>> factorize(360)
    {2: 3, 3: 2, 5: 1}
    >>> is_prime(2 ** 61 - 1)
    True
    >>> modular_inverse(3, 11)
    4
"""

from __future__ import annotations

import math
import random
from fractions import Fraction
from typing import Dict, List, Sequence, Tuple

__all__ = [
    "gcd",
    "lcm",
    "extended_gcd",
    "is_prime",
    "primes_up_to",
    "prime_factors",
    "factorize",
    "divisors",
    "divisor_sum",
    "totient",
    "mobius",
    "next_prime",
    "previous_prime",
    "nth_prime",
    "modular_inverse",
    "modular_power",
    "chinese_remainder",
    "continued_fraction",
    "from_continued_fraction",
    "rational_approximation",
    "fibonacci",
    "fibonacci_sequence",
    "catalan",
    "collatz",
    "harmonic_number",
    "bernoulli",
    "is_perfect",
    "digits_of",
    "digit_sum",
    "to_base",
]


# --------------------------------------------------------------------------
# Divisibility
# --------------------------------------------------------------------------


def gcd(*values: int) -> int:
    """Greatest common divisor of any number of integers."""
    if not values:
        raise ValueError("gcd needs at least one argument")
    return math.gcd(*(abs(int(v)) for v in values))


def lcm(*values: int) -> int:
    """Least common multiple of any number of integers."""
    if not values:
        raise ValueError("lcm needs at least one argument")
    return math.lcm(*(abs(int(v)) for v in values))


def extended_gcd(a: int, b: int) -> Tuple[int, int, int]:
    """Return ``(g, x, y)`` with ``a*x + b*y == g == gcd(a, b)``."""
    old_r, r = int(a), int(b)
    old_s, s = 1, 0
    old_t, t = 0, 1
    while r:
        quotient = old_r // r
        old_r, r = r, old_r - quotient * r
        old_s, s = s, old_s - quotient * s
        old_t, t = t, old_t - quotient * t
    if old_r < 0:
        old_r, old_s, old_t = -old_r, -old_s, -old_t
    return old_r, old_s, old_t


# --------------------------------------------------------------------------
# Primes
# --------------------------------------------------------------------------

_SMALL_PRIMES = (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37)


def is_prime(n: int) -> bool:
    """Deterministic Miller-Rabin primality test (exact for 64-bit inputs)."""
    n = int(n)
    if n < 2:
        return False
    for p in _SMALL_PRIMES:
        if n % p == 0:
            return n == p

    d = n - 1
    exponent = 0
    while d % 2 == 0:
        d //= 2
        exponent += 1

    for witness in _SMALL_PRIMES:
        x = pow(witness, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(exponent - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True


def primes_up_to(limit: int) -> List[int]:
    """All primes <= ``limit`` via the sieve of Eratosthenes."""
    limit = int(limit)
    if limit < 2:
        return []
    sieve = bytearray([1]) * (limit + 1)
    sieve[0] = sieve[1] = 0
    for n in range(2, int(limit ** 0.5) + 1):
        if sieve[n]:
            sieve[n * n :: n] = bytearray(len(sieve[n * n :: n]))
    return [n for n in range(limit + 1) if sieve[n]]


def _pollard_rho(n: int) -> int:
    """Find a non-trivial factor of a composite ``n``."""
    if n % 2 == 0:
        return 2
    while True:
        x = random.randrange(2, n)
        y = x
        c = random.randrange(1, n)
        d = 1
        while d == 1:
            x = (x * x + c) % n
            y = (y * y + c) % n
            y = (y * y + c) % n
            d = math.gcd(abs(x - y), n)
        if d != n:
            return d


def prime_factors(n: int) -> List[int]:
    """Prime factors of ``n`` with multiplicity, sorted ascending."""
    n = int(n)
    if n == 0:
        raise ValueError("0 has no prime factorization")
    factors: List[int] = []
    if n < 0:
        factors.append(-1)
        n = -n
    for p in _SMALL_PRIMES:
        while n % p == 0:
            factors.append(p)
            n //= p

    stack = [n] if n > 1 else []
    while stack:
        value = stack.pop()
        if value == 1:
            continue
        if is_prime(value):
            factors.append(value)
            continue
        divisor = _pollard_rho(value)
        stack.append(divisor)
        stack.append(value // divisor)
    return sorted(factors)


def factorize(n: int) -> Dict[int, int]:
    """Prime factorization as a ``{prime: exponent}`` mapping."""
    result: Dict[int, int] = {}
    for factor in prime_factors(n):
        result[factor] = result.get(factor, 0) + 1
    return result


def divisors(n: int) -> List[int]:
    """All positive divisors of ``n``, sorted ascending."""
    n = abs(int(n))
    if n == 0:
        raise ValueError("every integer divides 0")
    result = [1]
    for prime, exponent in factorize(n).items():
        powers = [prime ** e for e in range(exponent + 1)]
        result = [d * p for d in result for p in powers]
    return sorted(result)


def divisor_sum(n: int, power: int = 1) -> int:
    """Sigma function: the sum of each divisor raised to ``power``."""
    return sum(d ** power for d in divisors(n))


def totient(n: int) -> int:
    """Euler's totient: how many integers in [1, n] are coprime to ``n``."""
    n = int(n)
    if n < 1:
        raise ValueError("totient is defined for positive integers")
    result = n
    for prime in factorize(n) if n > 1 else {}:
        result -= result // prime
    return result


def mobius(n: int) -> int:
    """The Moebius function: 0 if ``n`` has a squared factor, else (-1)^k."""
    n = int(n)
    if n < 1:
        raise ValueError("mobius is defined for positive integers")
    if n == 1:
        return 1
    exponents = factorize(n)
    if any(exponent > 1 for exponent in exponents.values()):
        return 0
    return -1 if len(exponents) % 2 else 1


def next_prime(n: int) -> int:
    """The smallest prime strictly greater than ``n``."""
    candidate = max(int(n), 1) + 1
    if candidate <= 2:
        return 2
    if candidate % 2 == 0:
        candidate += 1 if candidate != 2 else 0
    while not is_prime(candidate):
        candidate += 1 if candidate % 2 == 0 else 2
    return candidate


def previous_prime(n: int) -> int:
    """The largest prime strictly less than ``n``."""
    candidate = int(n) - 1
    if candidate < 2:
        raise ValueError("no prime below 2")
    while not is_prime(candidate):
        candidate -= 1
    return candidate


def nth_prime(n: int) -> int:
    """The ``n``-th prime, counting from 1 (so ``nth_prime(1) == 2``)."""
    if n < 1:
        raise ValueError("n must be at least 1")
    if n < 6:
        return [2, 3, 5, 7, 11][n - 1]
    # Rosser's bound keeps the sieve comfortably large enough.
    limit = int(n * (math.log(n) + math.log(math.log(n)))) + 10
    return primes_up_to(limit)[n - 1]


# --------------------------------------------------------------------------
# Modular arithmetic
# --------------------------------------------------------------------------


def modular_inverse(a: int, modulus: int) -> int:
    """The inverse of ``a`` modulo ``modulus``, if it exists."""
    g, x, _ = extended_gcd(int(a) % int(modulus), int(modulus))
    if g != 1:
        raise ValueError(f"{a} is not invertible modulo {modulus}")
    return x % modulus


def modular_power(base: int, exponent: int, modulus: int) -> int:
    """Fast modular exponentiation, allowing a negative exponent."""
    if exponent < 0:
        return pow(modular_inverse(base, modulus), -exponent, modulus)
    return pow(int(base), int(exponent), int(modulus))


def chinese_remainder(
    remainders: Sequence[int], moduli: Sequence[int]
) -> Tuple[int, int]:
    """Solve a system of congruences; returns ``(solution, combined modulus)``.

    The moduli need not be coprime — inconsistent systems raise ValueError.
    """
    if len(remainders) != len(moduli):
        raise ValueError("remainders and moduli must have the same length")
    if not moduli:
        raise ValueError("at least one congruence is required")

    solution, modulus = int(remainders[0]) % int(moduli[0]), int(moduli[0])
    for remainder, m in zip(remainders[1:], moduli[1:]):
        remainder, m = int(remainder), int(m)
        g, p, _ = extended_gcd(modulus, m)
        difference = remainder - solution
        if difference % g:
            raise ValueError("the congruences are inconsistent")
        combined = modulus // g * m
        solution = (solution + modulus * ((difference // g) * p % (m // g))) % combined
        modulus = combined
    return solution, modulus


# --------------------------------------------------------------------------
# Continued fractions and rational approximation
# --------------------------------------------------------------------------


def continued_fraction(value: float, terms: int = 12) -> List[int]:
    """The continued fraction expansion [a0; a1, a2, ...] of ``value``."""
    if terms < 1:
        raise ValueError("terms must be at least 1")
    result: List[int] = []
    remainder = float(value)
    for _ in range(terms):
        whole = math.floor(remainder)
        result.append(int(whole))
        fractional = remainder - whole
        if fractional < 1e-12:
            break
        remainder = 1.0 / fractional
    return result


def from_continued_fraction(terms: Sequence[int]) -> Fraction:
    """Rebuild the exact rational value of a continued fraction."""
    if not terms:
        raise ValueError("at least one term is required")
    value = Fraction(terms[-1])
    for term in reversed(terms[:-1]):
        value = term + 1 / value
    return value


def rational_approximation(value: float, max_denominator: int = 1000000) -> Fraction:
    """Best rational approximation of ``value`` with a bounded denominator."""
    return Fraction(value).limit_denominator(max_denominator)


# --------------------------------------------------------------------------
# Classic sequences
# --------------------------------------------------------------------------


def fibonacci(n: int) -> int:
    """The ``n``-th Fibonacci number by fast doubling (exact, O(log n))."""
    if n < 0:
        # F(-n) = (-1)^(n+1) F(n)
        value = fibonacci(-n)
        return value if (-n) % 2 else -value

    def doubling(k: int) -> Tuple[int, int]:
        if k == 0:
            return 0, 1
        a, b = doubling(k >> 1)
        c = a * (2 * b - a)
        d = a * a + b * b
        return (d, c + d) if k & 1 else (c, d)

    return doubling(int(n))[0]


def fibonacci_sequence(count: int) -> List[int]:
    """The first ``count`` Fibonacci numbers, starting at F(0) = 0."""
    if count < 0:
        raise ValueError("count must be non-negative")
    result: List[int] = []
    a, b = 0, 1
    for _ in range(count):
        result.append(a)
        a, b = b, a + b
    return result


def catalan(n: int) -> int:
    """The ``n``-th Catalan number."""
    if n < 0:
        raise ValueError("n must be non-negative")
    return math.comb(2 * n, n) // (n + 1)


def collatz(n: int) -> List[int]:
    """The Collatz (3n+1) trajectory from ``n`` down to 1."""
    n = int(n)
    if n < 1:
        raise ValueError("n must be a positive integer")
    sequence = [n]
    while n != 1:
        n = n // 2 if n % 2 == 0 else 3 * n + 1
        sequence.append(n)
    return sequence


def harmonic_number(n: int) -> Fraction:
    """The exact harmonic number H(n) = 1 + 1/2 + ... + 1/n."""
    if n < 1:
        raise ValueError("n must be a positive integer")
    return sum((Fraction(1, k) for k in range(1, n + 1)), Fraction(0))


def bernoulli(n: int) -> Fraction:
    """The ``n``-th Bernoulli number (with B(1) = +1/2) via Akiyama-Tanigawa."""
    if n < 0:
        raise ValueError("n must be non-negative")
    row: list[Fraction] = [Fraction(0)] * (n + 1)
    for j in range(n + 1):
        row[j] = Fraction(1, j + 1)
        for m in range(j, 0, -1):
            row[m - 1] = m * (row[m - 1] - row[m])
    return row[0]


def is_perfect(n: int) -> bool:
    """Whether ``n`` equals the sum of its proper divisors."""
    n = int(n)
    return n > 1 and divisor_sum(n) - n == n


# --------------------------------------------------------------------------
# Digits and bases
# --------------------------------------------------------------------------


def digits_of(n: int, base: int = 10) -> List[int]:
    """The digits of ``n`` in the given base, most significant first."""
    n = abs(int(n))
    if base < 2:
        raise ValueError("base must be at least 2")
    if n == 0:
        return [0]
    result: List[int] = []
    while n:
        result.append(n % base)
        n //= base
    return result[::-1]


def digit_sum(n: int, base: int = 10) -> int:
    """Sum of the digits of ``n`` in the given base."""
    return sum(digits_of(n, base))


def to_base(n: int, base: int) -> str:
    """Render ``n`` in a base from 2 to 36 using digits and letters."""
    if not 2 <= base <= 36:
        raise ValueError("base must be between 2 and 36")
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
    sign = "-" if n < 0 else ""
    return sign + "".join(alphabet[d] for d in digits_of(n, base))
