"""Tests for descriptive statistics, regression and distributions."""

import math
import unittest

from mathkit.statistics import (
    binomial_cdf,
    binomial_pmf,
    combinations,
    confidence_interval,
    correlation,
    covariance,
    exponential_cdf,
    geometric_mean,
    harmonic_mean,
    kurtosis,
    linear_regression,
    mean,
    median,
    mode,
    multinomial,
    normal_cdf,
    normal_pdf,
    normal_quantile,
    permutations,
    poisson_cdf,
    poisson_pmf,
    polynomial_regression,
    quantile,
    quartiles,
    skewness,
    standard_deviation,
    summary,
    variance,
    z_scores,
)


class TestDescriptive(unittest.TestCase):
    def setUp(self):
        self.data = [2, 4, 4, 4, 5, 5, 7, 9]

    def test_averages(self):
        self.assertEqual(mean(self.data), 5.0)
        self.assertEqual(median(self.data), 4.5)
        self.assertEqual(median([1, 2, 3]), 2.0)
        self.assertEqual(mode(self.data), [4.0])
        self.assertEqual(mode([1, 1, 2, 2]), [1.0, 2.0])
        self.assertAlmostEqual(geometric_mean([1, 4, 16]), 4.0)
        self.assertAlmostEqual(harmonic_mean([1, 2, 4]), 12.0 / 7.0)

    def test_spread(self):
        self.assertAlmostEqual(variance(self.data, sample=False), 4.0)
        self.assertAlmostEqual(standard_deviation(self.data, sample=False), 2.0)
        self.assertAlmostEqual(variance(self.data), 32.0 / 7.0)

    def test_quantiles(self):
        self.assertEqual(quantile([1, 2, 3, 4], 0.0), 1.0)
        self.assertEqual(quantile([1, 2, 3, 4], 1.0), 4.0)
        self.assertEqual(quantile([1, 2, 3, 4], 0.5), 2.5)
        q1, q2, q3 = quartiles([1, 2, 3, 4, 5])
        self.assertEqual((q1, q2, q3), (2.0, 3.0, 4.0))
        with self.assertRaises(ValueError):
            quantile([1, 2], 1.5)

    def test_shape(self):
        self.assertAlmostEqual(skewness([1, 2, 3, 4, 5]), 0.0, places=12)
        self.assertGreater(skewness([1, 1, 1, 10]), 0.0)
        self.assertAlmostEqual(kurtosis([1, 2, 3, 4, 5]), -1.3, places=10)

    def test_z_scores_are_standardized(self):
        scores = z_scores(self.data)
        self.assertAlmostEqual(mean(scores), 0.0, places=12)
        self.assertAlmostEqual(standard_deviation(scores), 1.0, places=12)

    def test_summary_keys(self):
        result = summary(self.data)
        for key in ("count", "mean", "median", "min", "max", "variance", "stdev"):
            self.assertIn(key, result)
        self.assertEqual(result["count"], 8.0)

    def test_empty_and_constant_data(self):
        with self.assertRaises(ValueError):
            mean([])
        with self.assertRaises(ValueError):
            variance([1])
        with self.assertRaises(ValueError):
            z_scores([3, 3, 3])


class TestBivariate(unittest.TestCase):
    def test_correlation_extremes(self):
        self.assertAlmostEqual(correlation([1, 2, 3], [2, 4, 6]), 1.0, places=12)
        self.assertAlmostEqual(correlation([1, 2, 3], [6, 4, 2]), -1.0, places=12)

    def test_covariance(self):
        self.assertAlmostEqual(covariance([1, 2, 3], [2, 4, 6]), 2.0)

    def test_perfect_linear_fit(self):
        fit = linear_regression([1, 2, 3, 4], [3, 5, 7, 9])
        self.assertAlmostEqual(fit.slope, 2.0, places=12)
        self.assertAlmostEqual(fit.intercept, 1.0, places=12)
        self.assertAlmostEqual(fit.r_squared, 1.0, places=12)
        self.assertAlmostEqual(fit.predict(5), 11.0, places=12)

    def test_polynomial_regression_recovers_a_quadratic(self):
        xs = [0, 1, 2, 3, 4]
        ys = [1 + 2 * x + 3 * x * x for x in xs]
        coefficients = polynomial_regression(xs, ys, 2)
        for got, want in zip(coefficients, [1.0, 2.0, 3.0]):
            self.assertAlmostEqual(got, want, places=7)

    def test_mismatched_lengths(self):
        with self.assertRaises(ValueError):
            correlation([1, 2, 3], [1, 2])


class TestCombinatorics(unittest.TestCase):
    def test_counts(self):
        self.assertEqual(permutations(10, 3), 720)
        self.assertEqual(combinations(10, 3), 120)
        self.assertEqual(combinations(5, 0), 1)
        self.assertEqual(multinomial(2, 3, 4), 1260)


class TestDistributions(unittest.TestCase):
    def test_binomial(self):
        self.assertAlmostEqual(binomial_pmf(2, 5, 0.5), 10 / 32)
        self.assertAlmostEqual(binomial_cdf(5, 5, 0.5), 1.0, places=12)
        self.assertEqual(binomial_pmf(6, 5, 0.5), 0.0)
        self.assertAlmostEqual(
            sum(binomial_pmf(k, 8, 0.3) for k in range(9)), 1.0, places=12
        )
        with self.assertRaises(ValueError):
            binomial_pmf(1, 5, 1.5)

    def test_poisson(self):
        self.assertAlmostEqual(poisson_pmf(0, 2.0), math.exp(-2.0), places=12)
        self.assertAlmostEqual(
            sum(poisson_pmf(k, 3.0) for k in range(40)), 1.0, places=10
        )
        self.assertAlmostEqual(poisson_cdf(0, 2.0), math.exp(-2.0), places=12)

    def test_normal(self):
        self.assertAlmostEqual(normal_cdf(0.0), 0.5, places=12)
        self.assertAlmostEqual(normal_cdf(1.96), 0.975, places=4)
        self.assertAlmostEqual(normal_pdf(0.0), 1.0 / math.sqrt(2 * math.pi), places=12)
        self.assertAlmostEqual(normal_quantile(0.975), 1.959963985, places=6)
        # The quantile function inverts the CDF.
        for p in (0.01, 0.25, 0.5, 0.75, 0.99):
            self.assertAlmostEqual(normal_cdf(normal_quantile(p)), p, places=9)

    def test_exponential(self):
        self.assertAlmostEqual(exponential_cdf(0.0, 2.0), 0.0)
        self.assertAlmostEqual(exponential_cdf(math.log(2.0), 1.0), 0.5, places=12)

    def test_confidence_interval_brackets_the_mean(self):
        data = [2, 4, 4, 4, 5, 5, 7, 9]
        low, high = confidence_interval(data)
        self.assertLess(low, mean(data))
        self.assertGreater(high, mean(data))
        wide = confidence_interval(data, 0.99)
        self.assertLess(wide[0], low)


if __name__ == "__main__":
    unittest.main()
