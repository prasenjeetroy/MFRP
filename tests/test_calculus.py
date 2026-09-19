"""Tests for numerical differentiation, integration, limits and ODEs."""

import math
import unittest

from mathkit.calculus import (
    adaptive_simpson,
    arc_length,
    derivative,
    double_integral,
    euler_method,
    gauss_legendre,
    gradient,
    hessian,
    improper_integral,
    integrate,
    limit,
    nth_derivative,
    runge_kutta4,
    second_derivative,
    surface_of_revolution,
    taylor_coefficients,
    trapezoid,
)


class TestDerivatives(unittest.TestCase):
    def test_first_derivative(self):
        self.assertAlmostEqual(derivative(math.sin, 0.0), 1.0, places=9)
        self.assertAlmostEqual(derivative(math.exp, 1.0), math.e, places=8)
        self.assertAlmostEqual(derivative(lambda x: x ** 3, 2.0), 12.0, places=7)

    def test_second_derivative(self):
        self.assertAlmostEqual(second_derivative(lambda x: x ** 3, 2.0), 12.0, places=5)
        self.assertAlmostEqual(second_derivative(math.sin, 0.5), -math.sin(0.5), places=6)

    def test_nth_derivative(self):
        self.assertAlmostEqual(nth_derivative(math.sin, 0.0, 3), -1.0, places=5)
        self.assertAlmostEqual(nth_derivative(math.exp, 0.0, 4), 1.0, places=4)
        self.assertEqual(nth_derivative(math.cos, 1.0, 0), math.cos(1.0))

    def test_gradient_and_hessian(self):
        f = lambda p: p[0] ** 2 + 3.0 * p[0] * p[1] + p[1] ** 2
        gx, gy = gradient(f, [1.0, 2.0])
        self.assertAlmostEqual(gx, 2.0 * 1.0 + 3.0 * 2.0, places=6)
        self.assertAlmostEqual(gy, 3.0 * 1.0 + 2.0 * 2.0, places=6)
        h = hessian(f, [1.0, 2.0])
        self.assertAlmostEqual(h[0][0], 2.0, places=4)
        self.assertAlmostEqual(h[0][1], 3.0, places=4)
        self.assertAlmostEqual(h[1][1], 2.0, places=4)


class TestIntegration(unittest.TestCase):
    def test_every_method_agrees_on_a_polynomial(self):
        # The two first-order rules converge as O(h^2), so they are held to a
        # looser tolerance than the higher-order ones.
        tolerances = {"trapezoid": 4, "midpoint": 4}
        for method in ("adaptive", "romberg", "simpson", "trapezoid", "midpoint", "gauss"):
            value = integrate(lambda x: x ** 2, 0.0, 3.0, method=method)
            self.assertAlmostEqual(
                value, 9.0, places=tolerances.get(method, 8), msg=method
            )

    def test_known_integrals(self):
        self.assertAlmostEqual(integrate(math.sin, 0.0, math.pi), 2.0, places=9)
        self.assertAlmostEqual(integrate(math.exp, 0.0, 1.0), math.e - 1.0, places=9)
        self.assertAlmostEqual(integrate(lambda x: 1.0 / x, 1.0, math.e), 1.0, places=8)

    def test_orientation_and_degenerate_interval(self):
        self.assertEqual(integrate(math.sin, 1.0, 1.0), 0.0)
        forward = integrate(math.cos, 0.0, 1.0)
        self.assertAlmostEqual(integrate(math.cos, 1.0, 0.0), -forward, places=10)

    def test_gauss_legendre_is_exact_for_low_degree(self):
        # n nodes integrate degree 2n-1 exactly, up to rounding.
        self.assertAlmostEqual(
            gauss_legendre(lambda x: x ** 5 - 2 * x ** 3 + 1, -1.0, 2.0, 4),
            (2 ** 6 / 6 - 2 * 2 ** 4 / 4 + 2) - ((-1) ** 6 / 6 - 2 * (-1) ** 4 / 4 - 1),
            places=10,
        )

    def test_improper_integrals(self):
        self.assertAlmostEqual(
            improper_integral(lambda x: math.exp(-x * x), -math.inf, math.inf),
            math.sqrt(math.pi), places=9,
        )
        self.assertAlmostEqual(
            improper_integral(lambda x: 1.0 / (x * x), 1.0, math.inf), 1.0, places=6,
        )
        self.assertAlmostEqual(
            integrate(lambda x: 1.0 / (1.0 + x * x), -math.inf, math.inf),
            math.pi, places=8,
        )

    def test_adaptive_handles_a_sharp_peak(self):
        # A narrow Lorentzian that fixed-step rules under-resolve.
        peak = lambda x: 1.0 / (1.0 + 10000.0 * (x - 0.5) ** 2)
        exact = (math.atan(100 * 0.5) - math.atan(-100 * 0.5)) / 100.0
        self.assertAlmostEqual(adaptive_simpson(peak, 0.0, 1.0), exact, places=9)

    def test_double_integral(self):
        self.assertAlmostEqual(
            double_integral(lambda x, y: x * y, (0.0, 1.0), (0.0, 1.0)), 0.25, places=10
        )
        # Area between y = x^2 and y = x over [0, 1] equals 1/6.
        self.assertAlmostEqual(
            double_integral(lambda x, y: 1.0, (0.0, 1.0), lambda x: (x * x, x)),
            1.0 / 6.0, places=9,
        )

    def test_invalid_arguments(self):
        with self.assertRaises(ValueError):
            trapezoid(math.sin, 0.0, 1.0, 0)
        with self.assertRaises(ValueError):
            integrate(math.sin, 0.0, 1.0, method="nonsense")


class TestLimits(unittest.TestCase):
    def test_removable_singularities(self):
        self.assertAlmostEqual(limit(lambda x: math.sin(x) / x, 0.0), 1.0, places=8)
        self.assertAlmostEqual(
            limit(lambda x: (math.exp(x) - 1.0) / x, 0.0), 1.0, places=7
        )
        self.assertAlmostEqual(
            limit(lambda x: (1.0 - math.cos(x)) / (x * x), 0.0), 0.5, places=6
        )
        self.assertAlmostEqual(
            limit(lambda x: (x * x - 1.0) / (x - 1.0), 1.0), 2.0, places=8
        )

    def test_one_sided_limits(self):
        self.assertEqual(limit(lambda x: 1.0 / x, 0.0, "right"), math.inf)
        self.assertEqual(limit(lambda x: 1.0 / x, 0.0, "left"), -math.inf)

    def test_two_sided_limit_that_does_not_exist(self):
        with self.assertRaises(ValueError):
            limit(lambda x: 1.0 / x, 0.0)

    def test_bad_side(self):
        with self.assertRaises(ValueError):
            limit(math.sin, 0.0, "sideways")


class TestSeriesAndApplications(unittest.TestCase):
    def test_taylor_coefficients_of_exp(self):
        coefficients = taylor_coefficients(math.exp, 0.0, 4)
        for n, coefficient in enumerate(coefficients):
            self.assertAlmostEqual(coefficient, 1.0 / math.factorial(n), places=4)

    def test_arc_length_of_a_straight_line(self):
        self.assertAlmostEqual(arc_length(lambda x: 3.0 * x, 0.0, 1.0),
                               math.sqrt(10.0), places=7)

    def test_surface_of_revolution_of_a_cylinder(self):
        # Rotating y = 2 over [0, 5] sweeps a cylinder of area 2*pi*r*h.
        self.assertAlmostEqual(
            surface_of_revolution(lambda x: 2.0, 0.0, 5.0),
            2.0 * math.pi * 2.0 * 5.0, places=6,
        )


class TestODEs(unittest.TestCase):
    def test_runge_kutta_beats_euler_on_exponential_growth(self):
        rk = runge_kutta4(lambda t, y: y, 1.0, 0.0, 1.0, 100)[-1][1]
        eu = euler_method(lambda t, y: y, 1.0, 0.0, 1.0, 100)[-1][1]
        self.assertAlmostEqual(rk, math.e, places=9)
        self.assertLess(abs(rk - math.e), abs(eu - math.e))

    def test_logistic_equation(self):
        # y' = y(1-y), y(0) = 0.5 has the closed form 1/(1+exp(-t)).
        trajectory = runge_kutta4(lambda t, y: y * (1.0 - y), 0.5, 0.0, 5.0, 500)
        for t, y in trajectory[::100]:
            self.assertAlmostEqual(y, 1.0 / (1.0 + math.exp(-t)), places=8)

    def test_invalid_steps(self):
        with self.assertRaises(ValueError):
            runge_kutta4(lambda t, y: y, 1.0, 0.0, 1.0, 0)


if __name__ == "__main__":
    unittest.main()
