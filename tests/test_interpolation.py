"""Tests for interpolation and curve fitting."""

import math
import unittest

from mathkit.interpolation import (
    chebyshev_nodes,
    cubic_spline,
    exponential_fit,
    lagrange,
    least_squares_fit,
    linear_interpolation,
    newton_divided_differences,
    power_fit,
)


class TestInterpolants(unittest.TestCase):
    def setUp(self):
        self.points = [(0, 1), (1, 3), (2, 7), (3, 13)]  # y = x^2 + x + 1

    def test_interpolants_pass_through_every_point(self):
        for build in (lagrange, newton_divided_differences,
                      linear_interpolation, cubic_spline):
            f = build(self.points)
            for x, y in self.points:
                self.assertAlmostEqual(f(x), y, places=9, msg=f"{build.__name__} at {x}")

    def test_lagrange_and_newton_agree(self):
        a = lagrange(self.points)
        b = newton_divided_differences(self.points)
        for x in (0.3, 1.5, 2.7):
            self.assertAlmostEqual(a(x), b(x), places=9)

    def test_polynomial_is_recovered_exactly(self):
        f = lagrange(self.points)
        for x in (-1.0, 0.5, 1.5, 4.0):
            self.assertAlmostEqual(f(x), x * x + x + 1, places=8)

    def test_linear_interpolation_is_piecewise(self):
        f = linear_interpolation([(0, 0), (1, 10), (2, 10)])
        self.assertAlmostEqual(f(0.5), 5.0)
        self.assertAlmostEqual(f(1.5), 10.0)

    def test_spline_tracks_a_smooth_function_closely(self):
        points = [(i * math.pi / 6, math.sin(i * math.pi / 6)) for i in range(13)]
        f = cubic_spline(points)
        for x in (0.7, 1.9, 3.3, 4.8, 5.6):
            self.assertAlmostEqual(f(x), math.sin(x), delta=2e-3)

    def test_natural_spline_flattens_at_the_endpoints(self):
        # A natural spline pins the second derivative to zero at both ends,
        # so it under-bends there relative to a curving function.
        points = [(x, float(x ** 3)) for x in range(-4, 5)]
        f = cubic_spline(points)
        interior = abs(f(0.5) - 0.5 ** 3)
        boundary = abs(f(3.5) - 3.5 ** 3)
        self.assertLess(interior, 0.05)
        self.assertGreater(boundary, interior)

    def test_spline_extrapolates_from_the_end_segments(self):
        points = [(0, 0), (1, 1), (2, 4), (3, 9)]
        f = cubic_spline(points)
        self.assertTrue(math.isfinite(f(-1.0)))
        self.assertTrue(math.isfinite(f(5.0)))

    def test_distinct_x_values_are_required(self):
        with self.assertRaises(ValueError):
            lagrange([(0, 1), (0, 2)])
        with self.assertRaises(ValueError):
            cubic_spline([(0, 1), (1, 2)])


class TestFitting(unittest.TestCase):
    def test_least_squares_recovers_a_quadratic(self):
        points = [(x, 2 + 3 * x + 4 * x * x) for x in range(6)]
        fitted = least_squares_fit(points, 2)
        for got, want in zip(fitted.coefficients, [2.0, 3.0, 4.0]):
            self.assertAlmostEqual(got, want, places=6)
        self.assertAlmostEqual(fitted(10), 2 + 30 + 400, places=4)

    def test_exponential_fit(self):
        a, b = exponential_fit([(x, 2.0 * math.exp(0.5 * x)) for x in range(5)])
        self.assertAlmostEqual(a, 2.0, places=8)
        self.assertAlmostEqual(b, 0.5, places=8)
        with self.assertRaises(ValueError):
            exponential_fit([(0, 1), (1, -1)])

    def test_power_fit(self):
        a, b = power_fit([(x, 3.0 * x ** 2) for x in range(1, 6)])
        self.assertAlmostEqual(a, 3.0, places=8)
        self.assertAlmostEqual(b, 2.0, places=8)


class TestNodes(unittest.TestCase):
    def test_chebyshev_nodes_lie_inside_the_interval(self):
        nodes = chebyshev_nodes(5, 0.0, 1.0)
        self.assertEqual(len(nodes), 5)
        self.assertTrue(all(0.0 < x < 1.0 for x in nodes))

    def test_chebyshev_nodes_tame_runges_phenomenon(self):
        runge = lambda x: 1.0 / (1.0 + 25.0 * x * x)
        even = [(-1.0 + 2.0 * i / 12, runge(-1.0 + 2.0 * i / 12)) for i in range(13)]
        cheb = [(x, runge(x)) for x in chebyshev_nodes(13, -1.0, 1.0)]
        even_error = max(abs(lagrange(even)(x) - runge(x))
                         for x in [-0.95, -0.9, 0.9, 0.95])
        cheb_error = max(abs(lagrange(cheb)(x) - runge(x))
                         for x in [-0.95, -0.9, 0.9, 0.95])
        self.assertLess(cheb_error, even_error)


if __name__ == "__main__":
    unittest.main()
