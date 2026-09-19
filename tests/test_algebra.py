"""Tests for polynomials, root finding and optimization."""

import math
import unittest

from mathkit.algebra import (
    ConvergenceError,
    Polynomial,
    bisection,
    brent,
    cubic_roots,
    find_all_roots,
    fixed_point,
    minimize_golden_section,
    newton,
    quadratic_roots,
    secant,
    solve_linear_system,
)


class TestPolynomial(unittest.TestCase):
    def setUp(self):
        self.cubic = Polynomial([-6, 11, -6, 1])  # (x-1)(x-2)(x-3)

    def test_degree_and_evaluation(self):
        self.assertEqual(self.cubic.degree, 3)
        self.assertEqual(self.cubic(0), -6.0)
        self.assertEqual(self.cubic(1), 0.0)
        self.assertEqual(self.cubic(4), 6.0)

    def test_trailing_zeros_are_trimmed(self):
        self.assertEqual(Polynomial([1, 2, 0, 0]).degree, 1)
        self.assertEqual(Polynomial([0, 0, 0]).degree, 0)

    def test_string_form(self):
        self.assertEqual(str(self.cubic), "x^3 - 6x^2 + 11x - 6")
        self.assertEqual(str(Polynomial([0])), "0")
        self.assertEqual(str(Polynomial([0, 1])), "x")

    def test_arithmetic(self):
        a = Polynomial([1, 2])       # 1 + 2x
        b = Polynomial([3, 0, 1])    # 3 + x^2
        self.assertEqual(a + b, Polynomial([4, 2, 1]))
        self.assertEqual(b - a, Polynomial([2, -2, 1]))
        self.assertEqual(a * b, Polynomial([3, 6, 1, 2]))
        self.assertEqual(a * 2, Polynomial([2, 4]))
        self.assertEqual(a ** 2, Polynomial([1, 4, 4]))

    def test_division(self):
        quotient, remainder = self.cubic.divide(Polynomial([-1, 1]))
        self.assertEqual(quotient, Polynomial([6, -5, 1]))
        self.assertEqual(remainder, Polynomial([0]))

        quotient, remainder = Polynomial([1, 0, 1]).divide(Polynomial([1, 1]))
        self.assertEqual(quotient, Polynomial([-1, 1]))
        self.assertEqual(remainder, Polynomial([2]))

    def test_calculus(self):
        self.assertEqual(self.cubic.derivative(), Polynomial([11, -12, 3]))
        self.assertEqual(self.cubic.derivative(2), Polynomial([-12, 6]))
        self.assertAlmostEqual(Polynomial([0, 0, 3]).integrate(0, 2), 8.0)
        self.assertEqual(Polynomial([2]).antiderivative(), Polynomial([0, 2]))

    def test_roots(self):
        self.assertEqual([round(r, 8) for r in self.cubic.real_roots()], [1.0, 2.0, 3.0])
        self.assertEqual(Polynomial([1, 0, 1]).real_roots(), [])
        self.assertEqual(
            [round(r, 8) for r in Polynomial([24, -50, 35, -10, 1]).real_roots()],
            [1.0, 2.0, 3.0, 4.0],
        )
        self.assertEqual(Polynomial([-4, 2]).real_roots(), [2.0])

    def test_from_roots_and_interpolate(self):
        self.assertEqual(Polynomial.from_roots([1, 2, 3]), self.cubic)
        self.assertEqual(
            Polynomial.interpolate([(0, 1), (1, 2), (2, 5)]), Polynomial([1, 0, 1])
        )
        with self.assertRaises(ValueError):
            Polynomial.interpolate([(0, 1), (0, 2)])

    def test_compose_and_gcd(self):
        self.assertEqual(
            Polynomial([0, 0, 1]).compose(Polynomial([1, 1])), Polynomial([1, 2, 1])
        )
        common = Polynomial.from_roots([1, 2, 3]).gcd(Polynomial.from_roots([2, 3, 4]))
        self.assertEqual([round(r, 6) for r in common.real_roots()], [2.0, 3.0])


class TestClosedForms(unittest.TestCase):
    def test_quadratic(self):
        r1, r2 = quadratic_roots(1, -3, 2)
        self.assertEqual(sorted((r1.real, r2.real)), [1.0, 2.0])
        r1, r2 = quadratic_roots(1, 0, 1)
        self.assertAlmostEqual(abs(r1.imag), 1.0)

    def test_quadratic_is_stable_for_tiny_c(self):
        # b^2 >> 4ac is where the naive formula loses the small root entirely.
        r1, r2 = quadratic_roots(1.0, 1e8, 1.0)
        small = min((r1.real, r2.real), key=abs)
        self.assertAlmostEqual(small, -1e-8, places=16)

    def test_cubic(self):
        roots = sorted(r.real for r in cubic_roots(1, -6, 11, -6))
        for got, want in zip(roots, [1.0, 2.0, 3.0]):
            self.assertAlmostEqual(got, want, places=6)


class TestRootFinding(unittest.TestCase):
    def test_all_methods_find_the_same_root(self):
        f = lambda x: math.cos(x) - x
        expected = 0.7390851332151607
        self.assertAlmostEqual(bisection(f, 0.0, 1.0), expected, places=10)
        self.assertAlmostEqual(brent(f, 0.0, 1.0), expected, places=12)
        self.assertAlmostEqual(newton(f, 0.5), expected, places=12)
        self.assertAlmostEqual(secant(f, 0.0, 1.0), expected, places=10)

    def test_newton_with_an_explicit_derivative(self):
        root = newton(lambda x: x * x - 2.0, 1.0, lambda x: 2.0 * x)
        self.assertAlmostEqual(root, math.sqrt(2.0), places=12)

    def test_newton_reports_a_vanishing_derivative(self):
        with self.assertRaises(ConvergenceError):
            newton(lambda x: x * x + 1.0, 0.0, lambda x: 2.0 * x)

    def test_bisection_requires_a_bracket(self):
        with self.assertRaises(ValueError):
            bisection(lambda x: x * x + 1.0, -1.0, 1.0)

    def test_find_all_roots(self):
        roots = find_all_roots(math.sin, 0.5, 10.0)
        expected = [math.pi, 2 * math.pi, 3 * math.pi]
        self.assertEqual(len(roots), len(expected))
        for got, want in zip(roots, expected):
            self.assertAlmostEqual(got, want, places=9)

    def test_fixed_point(self):
        # x = cos(x) converges to the Dottie number.
        self.assertAlmostEqual(fixed_point(math.cos, 0.5), 0.7390851332151607, places=8)

    def test_linear_system(self):
        solution = solve_linear_system([[2, 1], [1, 3]], [5, 10])
        self.assertAlmostEqual(solution[0], 1.0, places=10)
        self.assertAlmostEqual(solution[1], 3.0, places=10)


class TestOptimization(unittest.TestCase):
    def test_golden_section_finds_a_minimum(self):
        x, value = minimize_golden_section(lambda x: (x - 2.0) ** 2 + 1.0, 0.0, 5.0)
        self.assertAlmostEqual(x, 2.0, places=6)
        self.assertAlmostEqual(value, 1.0, places=10)


if __name__ == "__main__":
    unittest.main()
