"""Tests for primes, factorization, modular arithmetic and sequences."""

import math
import unittest
from fractions import Fraction

from mathkit.numbertheory import (
    bernoulli,
    catalan,
    chinese_remainder,
    collatz,
    continued_fraction,
    digit_sum,
    divisor_sum,
    divisors,
    extended_gcd,
    factorize,
    fibonacci,
    fibonacci_sequence,
    from_continued_fraction,
    gcd,
    harmonic_number,
    is_perfect,
    is_prime,
    lcm,
    mobius,
    modular_inverse,
    modular_power,
    next_prime,
    nth_prime,
    previous_prime,
    prime_factors,
    primes_up_to,
    rational_approximation,
    to_base,
    totient,
)


class TestDivisibility(unittest.TestCase):
    def test_gcd_and_lcm(self):
        self.assertEqual(gcd(12, 18), 6)
        self.assertEqual(gcd(12, 18, 24), 6)
        self.assertEqual(gcd(-12, 18), 6)
        self.assertEqual(lcm(4, 6), 12)
        self.assertEqual(lcm(3, 4, 5), 60)

    def test_extended_gcd_satisfies_bezout(self):
        for a, b in [(240, 46), (17, 5), (100, 75), (7, 13)]:
            g, x, y = extended_gcd(a, b)
            self.assertEqual(g, math.gcd(a, b))
            self.assertEqual(a * x + b * y, g)


class TestPrimes(unittest.TestCase):
    def test_is_prime(self):
        self.assertEqual(
            [n for n in range(30) if is_prime(n)], [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
        )
        self.assertFalse(is_prime(1))
        self.assertFalse(is_prime(0))
        self.assertFalse(is_prime(-7))
        self.assertFalse(is_prime(561))  # a Carmichael number
        self.assertTrue(is_prime(2 ** 61 - 1))
        self.assertFalse(is_prime(2 ** 64 - 1))

    def test_sieve(self):
        self.assertEqual(primes_up_to(1), [])
        self.assertEqual(primes_up_to(2), [2])
        self.assertEqual(len(primes_up_to(1000)), 168)
        self.assertEqual(primes_up_to(30)[-1], 29)

    def test_navigation(self):
        self.assertEqual(next_prime(100), 101)
        self.assertEqual(next_prime(2), 3)
        self.assertEqual(previous_prime(100), 97)
        self.assertEqual(nth_prime(1), 2)
        self.assertEqual(nth_prime(1000), 7919)

    def test_factorization(self):
        self.assertEqual(factorize(360), {2: 3, 3: 2, 5: 1})
        self.assertEqual(factorize(97), {97: 1})
        self.assertEqual(prime_factors(84), [2, 2, 3, 7])
        self.assertEqual(prime_factors(-84), [-1, 2, 2, 3, 7])
        with self.assertRaises(ValueError):
            prime_factors(0)

    def test_factorization_of_a_semiprime(self):
        # Pollard's rho has to do real work here.
        self.assertEqual(factorize(1000003 * 999983), {999983: 1, 1000003: 1})

    def test_factorizations_multiply_back(self):
        for n in [2, 12, 97, 1001, 123456, 999983]:
            product = 1
            for prime, power in factorize(n).items():
                product *= prime ** power
            self.assertEqual(product, n)


class TestArithmeticFunctions(unittest.TestCase):
    def test_divisors(self):
        self.assertEqual(divisors(36), [1, 2, 3, 4, 6, 9, 12, 18, 36])
        self.assertEqual(divisors(1), [1])
        self.assertEqual(divisor_sum(36), 91)
        self.assertEqual(divisor_sum(6), 12)

    def test_totient(self):
        self.assertEqual([totient(n) for n in range(1, 11)],
                         [1, 1, 2, 2, 4, 2, 6, 4, 6, 4])
        self.assertEqual(totient(97), 96)

    def test_mobius(self):
        self.assertEqual([mobius(n) for n in range(1, 11)],
                         [1, -1, -1, 0, -1, 1, -1, 0, 0, 1])

    def test_perfect_numbers(self):
        self.assertEqual([n for n in range(2, 500) if is_perfect(n)], [6, 28, 496])


class TestModular(unittest.TestCase):
    def test_inverse(self):
        self.assertEqual(modular_inverse(3, 11), 4)
        self.assertEqual(3 * modular_inverse(3, 11) % 11, 1)
        with self.assertRaises(ValueError):
            modular_inverse(2, 4)

    def test_power(self):
        self.assertEqual(modular_power(2, 10, 1000), 24)
        self.assertEqual(modular_power(3, -1, 11), 4)

    def test_chinese_remainder(self):
        solution, modulus = chinese_remainder([2, 3, 2], [3, 5, 7])
        self.assertEqual((solution, modulus), (23, 105))
        for remainder, m in zip([2, 3, 2], [3, 5, 7]):
            self.assertEqual(solution % m, remainder)

    def test_chinese_remainder_with_shared_factors(self):
        solution, modulus = chinese_remainder([1, 3], [4, 6])
        self.assertEqual(modulus, 12)
        self.assertEqual(solution % 4, 1)
        self.assertEqual(solution % 6, 3)
        with self.assertRaises(ValueError):
            chinese_remainder([0, 1], [4, 6])


class TestSequences(unittest.TestCase):
    def test_fibonacci(self):
        self.assertEqual(fibonacci_sequence(10), [0, 1, 1, 2, 3, 5, 8, 13, 21, 34])
        self.assertEqual(fibonacci(100), 354224848179261915075)
        self.assertEqual(fibonacci(-7), 13)  # F(-n) = (-1)^(n+1) F(n)
        self.assertEqual(fibonacci(-8), -21)

    def test_catalan(self):
        self.assertEqual([catalan(n) for n in range(8)],
                         [1, 1, 2, 5, 14, 42, 132, 429])

    def test_collatz(self):
        self.assertEqual(collatz(6), [6, 3, 10, 5, 16, 8, 4, 2, 1])
        self.assertEqual(len(collatz(27)), 112)
        with self.assertRaises(ValueError):
            collatz(0)

    def test_harmonic_numbers_are_exact(self):
        self.assertEqual(harmonic_number(1), Fraction(1))
        self.assertEqual(harmonic_number(4), Fraction(25, 12))

    def test_bernoulli_numbers(self):
        expected = [Fraction(1), Fraction(1, 2), Fraction(1, 6), Fraction(0),
                    Fraction(-1, 30), Fraction(0), Fraction(1, 42)]
        self.assertEqual([bernoulli(n) for n in range(7)], expected)
        self.assertEqual(bernoulli(12), Fraction(-691, 2730))


class TestRepresentation(unittest.TestCase):
    def test_continued_fractions(self):
        self.assertEqual(continued_fraction(math.pi, 4), [3, 7, 15, 1])
        self.assertEqual(from_continued_fraction([3, 7, 15, 1]), Fraction(355, 113))
        self.assertEqual(from_continued_fraction([2]), Fraction(2))

    def test_rational_approximation(self):
        self.assertEqual(rational_approximation(math.pi, 113), Fraction(355, 113))
        self.assertEqual(rational_approximation(0.5), Fraction(1, 2))

    def test_bases(self):
        self.assertEqual(to_base(255, 16), "ff")
        self.assertEqual(to_base(255, 2), "11111111")
        self.assertEqual(to_base(0, 7), "0")
        self.assertEqual(to_base(-10, 2), "-1010")
        self.assertEqual(digit_sum(9875), 29)
        with self.assertRaises(ValueError):
            to_base(5, 40)


if __name__ == "__main__":
    unittest.main()
