"""Descriptive statistics, regression, probability distributions and counting.

    >>> mean([1, 2, 3, 4])
    2.5
    >>> round(normal_cdf(1.96), 4)
    0.975
    >>> linear_regression([1, 2, 3], [2, 4, 6]).slope
    2.0
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict, List, Sequence, Tuple

__all__ = [
    "mean",
    "geometric_mean",
    "harmonic_mean",
    "median",
    "mode",
    "variance",
    "standard_deviation",
    "range_of",
    "quantile",
    "quartiles",
    "interquartile_range",
    "skewness",
    "kurtosis",
    "z_scores",
    "covariance",
    "correlation",
    "LinearFit",
    "linear_regression",
    "polynomial_regression",
    "summary",
    "permutations",
    "combinations",
    "multinomial",
    "binomial_pmf",
    "binomial_cdf",
    "poisson_pmf",
    "poisson_cdf",
    "geometric_pmf",
    "normal_pdf",
    "normal_cdf",
    "normal_quantile",
    "exponential_pdf",
    "exponential_cdf",
    "uniform_pdf",
    "confidence_interval",
]

Sample = Sequence[float]


def _require(data: Sample, minimum: int = 1) -> List[float]:
    values = [float(x) for x in data]
    if len(values) < minimum:
        raise ValueError(f"at least {minimum} data point(s) required")
    return values


# --------------------------------------------------------------------------
# Central tendency and spread
# --------------------------------------------------------------------------


def mean(data: Sample) -> float:
    """Arithmetic mean."""
    values = _require(data)
    return math.fsum(values) / len(values)


def geometric_mean(data: Sample) -> float:
    """Geometric mean; every value must be positive."""
    values = _require(data)
    if any(x <= 0 for x in values):
        raise ValueError("geometric mean requires positive values")
    return math.exp(math.fsum(math.log(x) for x in values) / len(values))


def harmonic_mean(data: Sample) -> float:
    """Harmonic mean; every value must be non-zero and of the same sign."""
    values = _require(data)
    if any(x == 0 for x in values):
        raise ValueError("harmonic mean requires non-zero values")
    return len(values) / math.fsum(1.0 / x for x in values)


def median(data: Sample) -> float:
    """Middle value, averaging the two central values for even samples."""
    values = sorted(_require(data))
    n = len(values)
    middle = n // 2
    return values[middle] if n % 2 else 0.5 * (values[middle - 1] + values[middle])


def mode(data: Sample) -> List[float]:
    """All values tied for the highest frequency, sorted ascending."""
    values = _require(data)
    counts: Dict[float, int] = {}
    for value in values:
        counts[value] = counts.get(value, 0) + 1
    highest = max(counts.values())
    return sorted(value for value, count in counts.items() if count == highest)


def variance(data: Sample, sample: bool = True) -> float:
    """Variance; ``sample=True`` uses the n-1 (Bessel-corrected) denominator."""
    values = _require(data, 2 if sample else 1)
    mu = mean(values)
    total = math.fsum((x - mu) ** 2 for x in values)
    return total / (len(values) - 1 if sample else len(values))


def standard_deviation(data: Sample, sample: bool = True) -> float:
    """Square root of the variance."""
    return math.sqrt(variance(data, sample))


def range_of(data: Sample) -> float:
    """Difference between the largest and smallest values."""
    values = _require(data)
    return max(values) - min(values)


def quantile(data: Sample, q: float) -> float:
    """The ``q``-quantile (0 <= q <= 1) by linear interpolation."""
    if not 0.0 <= q <= 1.0:
        raise ValueError("q must be between 0 and 1")
    values = sorted(_require(data))
    if len(values) == 1:
        return values[0]
    position = q * (len(values) - 1)
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return values[int(position)]
    weight = position - lower
    return values[lower] * (1.0 - weight) + values[upper] * weight


def quartiles(data: Sample) -> Tuple[float, float, float]:
    """The first, second (median) and third quartiles."""
    return quantile(data, 0.25), quantile(data, 0.5), quantile(data, 0.75)


def interquartile_range(data: Sample) -> float:
    """Q3 - Q1."""
    q1, _, q3 = quartiles(data)
    return q3 - q1


def skewness(data: Sample) -> float:
    """Population skewness (the third standardized moment)."""
    values = _require(data, 2)
    mu = mean(values)
    sigma = standard_deviation(values, sample=False)
    if sigma == 0:
        raise ValueError("skewness is undefined for constant data")
    return math.fsum((x - mu) ** 3 for x in values) / (len(values) * sigma ** 3)


def kurtosis(data: Sample, excess: bool = True) -> float:
    """Kurtosis; ``excess`` subtracts 3 so a normal sample scores about 0."""
    values = _require(data, 2)
    mu = mean(values)
    sigma = standard_deviation(values, sample=False)
    if sigma == 0:
        raise ValueError("kurtosis is undefined for constant data")
    value = math.fsum((x - mu) ** 4 for x in values) / (len(values) * sigma ** 4)
    return value - 3.0 if excess else value


def z_scores(data: Sample) -> List[float]:
    """Standardize a sample to zero mean and unit standard deviation."""
    values = _require(data, 2)
    mu = mean(values)
    sigma = standard_deviation(values)
    if sigma == 0:
        raise ValueError("cannot standardize constant data")
    return [(x - mu) / sigma for x in values]


# --------------------------------------------------------------------------
# Bivariate statistics
# --------------------------------------------------------------------------


def _paired(xs: Sample, ys: Sample) -> Tuple[List[float], List[float]]:
    x_values = _require(xs, 2)
    y_values = _require(ys, 2)
    if len(x_values) != len(y_values):
        raise ValueError("both samples must have the same length")
    return x_values, y_values


def covariance(xs: Sample, ys: Sample, sample: bool = True) -> float:
    """Covariance of two paired samples."""
    x_values, y_values = _paired(xs, ys)
    mx, my = mean(x_values), mean(y_values)
    total = math.fsum((x - mx) * (y - my) for x, y in zip(x_values, y_values))
    return total / (len(x_values) - 1 if sample else len(x_values))


def correlation(xs: Sample, ys: Sample) -> float:
    """Pearson's correlation coefficient, in [-1, 1]."""
    x_values, y_values = _paired(xs, ys)
    sx = standard_deviation(x_values)
    sy = standard_deviation(y_values)
    if sx == 0 or sy == 0:
        raise ValueError("correlation is undefined for constant data")
    return covariance(x_values, y_values) / (sx * sy)


@dataclass(frozen=True)
class LinearFit:
    """The result of a least-squares straight-line fit."""

    slope: float
    intercept: float
    r_squared: float

    def predict(self, x: float) -> float:
        """Value of the fitted line at ``x``."""
        return self.slope * x + self.intercept

    def __str__(self) -> str:
        sign = "+" if self.intercept >= 0 else "-"
        return (
            f"y = {self.slope:g}x {sign} {abs(self.intercept):g}  "
            f"(R^2 = {self.r_squared:.6f})"
        )


def linear_regression(xs: Sample, ys: Sample) -> LinearFit:
    """Least-squares fit of ``y = slope * x + intercept``."""
    x_values, y_values = _paired(xs, ys)
    mx, my = mean(x_values), mean(y_values)
    sxx = math.fsum((x - mx) ** 2 for x in x_values)
    if sxx == 0:
        raise ValueError("cannot fit a line to constant x values")
    sxy = math.fsum((x - mx) * (y - my) for x, y in zip(x_values, y_values))
    slope = sxy / sxx
    intercept = my - slope * mx
    syy = math.fsum((y - my) ** 2 for y in y_values)
    r_squared = 1.0 if syy == 0 else (sxy * sxy) / (sxx * syy)
    return LinearFit(slope, intercept, r_squared)


def polynomial_regression(xs: Sample, ys: Sample, degree: int) -> List[float]:
    """Least-squares polynomial fit; returns coefficients in ascending order."""
    from .linalg import Matrix

    x_values, y_values = _paired(xs, ys)
    if degree < 0:
        raise ValueError("degree must be non-negative")
    if len(x_values) <= degree:
        raise ValueError("need more data points than the degree")
    design = Matrix([[x ** power for power in range(degree + 1)] for x in x_values])
    return design.least_squares(y_values)


def summary(data: Sample) -> Dict[str, float]:
    """A dictionary of the usual descriptive statistics for ``data``."""
    values = _require(data)
    q1, q2, q3 = quartiles(values)
    result = {
        "count": float(len(values)),
        "mean": mean(values),
        "median": q2,
        "min": min(values),
        "max": max(values),
        "range": max(values) - min(values),
        "q1": q1,
        "q3": q3,
        "iqr": q3 - q1,
    }
    if len(values) > 1:
        result["variance"] = variance(values)
        result["stdev"] = standard_deviation(values)
    return result


# --------------------------------------------------------------------------
# Combinatorics
# --------------------------------------------------------------------------


def permutations(n: int, k: int | None = None) -> int:
    """Number of ordered arrangements P(n, k)."""
    return math.perm(int(n), None if k is None else int(k))


def combinations(n: int, k: int) -> int:
    """Binomial coefficient C(n, k)."""
    return math.comb(int(n), int(k))


def multinomial(*counts: int) -> int:
    """Multinomial coefficient (sum of counts)! / prod(count!)."""
    total = sum(counts)
    result = math.factorial(total)
    for count in counts:
        result //= math.factorial(count)
    return result


# --------------------------------------------------------------------------
# Distributions
# --------------------------------------------------------------------------


def binomial_pmf(k: int, n: int, p: float) -> float:
    """P(X = k) for X ~ Binomial(n, p)."""
    if not 0.0 <= p <= 1.0:
        raise ValueError("p must be between 0 and 1")
    if not 0 <= k <= n:
        return 0.0
    return math.comb(n, k) * p ** k * (1.0 - p) ** (n - k)


def binomial_cdf(k: int, n: int, p: float) -> float:
    """P(X <= k) for X ~ Binomial(n, p)."""
    return math.fsum(binomial_pmf(i, n, p) for i in range(0, min(k, n) + 1))


def poisson_pmf(k: int, rate: float) -> float:
    """P(X = k) for X ~ Poisson(rate)."""
    if rate < 0:
        raise ValueError("rate must be non-negative")
    if k < 0:
        return 0.0
    return math.exp(-rate + k * math.log(rate) - math.lgamma(k + 1)) if rate else float(k == 0)


def poisson_cdf(k: int, rate: float) -> float:
    """P(X <= k) for X ~ Poisson(rate)."""
    return math.fsum(poisson_pmf(i, rate) for i in range(0, max(k, -1) + 1))


def geometric_pmf(k: int, p: float) -> float:
    """P(X = k) for the number of trials up to and including the first success."""
    if not 0.0 < p <= 1.0:
        raise ValueError("p must be in (0, 1]")
    return 0.0 if k < 1 else (1.0 - p) ** (k - 1) * p


def normal_pdf(x: float, mu: float = 0.0, sigma: float = 1.0) -> float:
    """Density of the normal distribution."""
    if sigma <= 0:
        raise ValueError("sigma must be positive")
    z = (x - mu) / sigma
    return math.exp(-0.5 * z * z) / (sigma * math.sqrt(2.0 * math.pi))


def normal_cdf(x: float, mu: float = 0.0, sigma: float = 1.0) -> float:
    """Cumulative distribution of the normal distribution, via erf."""
    if sigma <= 0:
        raise ValueError("sigma must be positive")
    return 0.5 * (1.0 + math.erf((x - mu) / (sigma * math.sqrt(2.0))))


def normal_quantile(p: float, mu: float = 0.0, sigma: float = 1.0) -> float:
    """Inverse normal CDF (the probit function) by bisection on ``normal_cdf``."""
    if not 0.0 < p < 1.0:
        raise ValueError("p must be strictly between 0 and 1")
    low, high = -40.0, 40.0
    for _ in range(200):
        mid = 0.5 * (low + high)
        if normal_cdf(mid) < p:
            low = mid
        else:
            high = mid
    return mu + sigma * 0.5 * (low + high)


def exponential_pdf(x: float, rate: float = 1.0) -> float:
    """Density of the exponential distribution."""
    if rate <= 0:
        raise ValueError("rate must be positive")
    return rate * math.exp(-rate * x) if x >= 0 else 0.0


def exponential_cdf(x: float, rate: float = 1.0) -> float:
    """Cumulative distribution of the exponential distribution."""
    if rate <= 0:
        raise ValueError("rate must be positive")
    return 1.0 - math.exp(-rate * x) if x >= 0 else 0.0


def uniform_pdf(x: float, a: float = 0.0, b: float = 1.0) -> float:
    """Density of the continuous uniform distribution on [a, b]."""
    if b <= a:
        raise ValueError("b must be greater than a")
    return 1.0 / (b - a) if a <= x <= b else 0.0


def confidence_interval(data: Sample, level: float = 0.95) -> Tuple[float, float]:
    """Normal-approximation confidence interval for the mean."""
    if not 0.0 < level < 1.0:
        raise ValueError("level must be strictly between 0 and 1")
    values = _require(data, 2)
    centre = mean(values)
    margin = normal_quantile(0.5 + level / 2.0) * standard_deviation(values) / math.sqrt(
        len(values)
    )
    return centre - margin, centre + margin
