"""Interpolation and curve fitting.

    >>> f = lagrange([(0, 1), (1, 3), (2, 7)])
    >>> f(1.5)
    4.75
"""

from __future__ import annotations

import math
from typing import Callable, List, Sequence, Tuple

__all__ = [
    "lagrange",
    "newton_divided_differences",
    "divided_difference_table",
    "linear_interpolation",
    "cubic_spline",
    "chebyshev_nodes",
    "least_squares_fit",
    "exponential_fit",
    "power_fit",
]

Point = Tuple[float, float]


def _check_points(points: Sequence[Point], minimum: int = 2) -> List[Point]:
    data = [(float(x), float(y)) for x, y in points]
    if len(data) < minimum:
        raise ValueError(f"at least {minimum} points are required")
    xs = [x for x, _ in data]
    if len(set(xs)) != len(xs):
        raise ValueError("x values must be distinct")
    return data


def lagrange(points: Sequence[Point]) -> Callable[[float], float]:
    """Lagrange interpolating polynomial through ``points``, as a callable."""
    data = _check_points(points, 1)

    def interpolant(x: float) -> float:
        total = 0.0
        for i, (xi, yi) in enumerate(data):
            term = yi
            for j, (xj, _) in enumerate(data):
                if i != j:
                    term *= (x - xj) / (xi - xj)
            total += term
        return total

    return interpolant


def divided_difference_table(points: Sequence[Point]) -> List[List[float]]:
    """Newton's full divided difference triangle for ``points``."""
    data = _check_points(points, 1)
    n = len(data)
    table = [[0.0] * n for _ in range(n)]
    for i, (_, y) in enumerate(data):
        table[i][0] = y
    for j in range(1, n):
        for i in range(n - j):
            table[i][j] = (table[i + 1][j - 1] - table[i][j - 1]) / (
                data[i + j][0] - data[i][0]
            )
    return table


def newton_divided_differences(points: Sequence[Point]) -> Callable[[float], float]:
    """Newton's divided-difference interpolant — same curve, cheaper updates."""
    data = _check_points(points, 1)
    coefficients = divided_difference_table(data)[0]

    def interpolant(x: float) -> float:
        total = 0.0
        product = 1.0
        for i, coefficient in enumerate(coefficients):
            total += coefficient * product
            product *= x - data[i][0]
        return total

    return interpolant


def linear_interpolation(points: Sequence[Point]) -> Callable[[float], float]:
    """Piecewise linear interpolation, extrapolating with the end segments."""
    data = sorted(_check_points(points))

    def interpolant(x: float) -> float:
        if x <= data[0][0]:
            left, right = data[0], data[1]
        elif x >= data[-1][0]:
            left, right = data[-2], data[-1]
        else:
            index = 0
            while data[index + 1][0] < x:
                index += 1
            left, right = data[index], data[index + 1]
        weight = (x - left[0]) / (right[0] - left[0])
        return left[1] + weight * (right[1] - left[1])

    return interpolant


def cubic_spline(points: Sequence[Point]) -> Callable[[float], float]:
    """Natural cubic spline through ``points`` (second derivative zero at ends)."""
    data = sorted(_check_points(points, 3))
    n = len(data) - 1
    xs = [p[0] for p in data]
    ys = [p[1] for p in data]
    h = [xs[i + 1] - xs[i] for i in range(n)]

    # Solve the tridiagonal system for the second derivatives (Thomas algorithm).
    alpha = [0.0] * (n + 1)
    for i in range(1, n):
        alpha[i] = 3.0 * ((ys[i + 1] - ys[i]) / h[i] - (ys[i] - ys[i - 1]) / h[i - 1])

    l = [1.0] + [0.0] * n
    mu = [0.0] * (n + 1)
    z = [0.0] * (n + 1)
    for i in range(1, n):
        l[i] = 2.0 * (xs[i + 1] - xs[i - 1]) - h[i - 1] * mu[i - 1]
        mu[i] = h[i] / l[i]
        z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i]

    c = [0.0] * (n + 1)
    b = [0.0] * n
    d = [0.0] * n
    for i in range(n - 1, -1, -1):
        c[i] = z[i] - mu[i] * c[i + 1]
        b[i] = (ys[i + 1] - ys[i]) / h[i] - h[i] * (c[i + 1] + 2.0 * c[i]) / 3.0
        d[i] = (c[i + 1] - c[i]) / (3.0 * h[i])

    def interpolant(x: float) -> float:
        # Binary search for the containing segment, clamped at both ends.
        low, high = 0, n - 1
        if x <= xs[0]:
            index = 0
        elif x >= xs[n]:
            index = n - 1
        else:
            while low < high:
                mid = (low + high + 1) // 2
                if xs[mid] <= x:
                    low = mid
                else:
                    high = mid - 1
            index = low
        dx = x - xs[index]
        return ys[index] + dx * (b[index] + dx * (c[index] + dx * d[index]))

    return interpolant


def chebyshev_nodes(n: int, a: float = -1.0, b: float = 1.0) -> List[float]:
    """``n`` Chebyshev nodes on [a, b] — the sample points that tame Runge's
    phenomenon when interpolating at high degree."""
    if n < 1:
        raise ValueError("n must be at least 1")
    return [
        0.5 * (a + b) + 0.5 * (b - a) * math.cos((2 * k + 1) * math.pi / (2 * n))
        for k in range(n)
    ]


def least_squares_fit(
    points: Sequence[Point], degree: int = 1
) -> Callable[[float], float]:
    """Least-squares polynomial fit of the given degree, as a callable."""
    from .statistics import polynomial_regression

    data = [(float(x), float(y)) for x, y in points]
    coefficients = polynomial_regression([x for x, _ in data], [y for _, y in data], degree)

    def fitted(x: float) -> float:
        total = 0.0
        for coefficient in reversed(coefficients):
            total = total * x + coefficient
        return total

    fitted.coefficients = coefficients  # type: ignore[attr-defined]
    return fitted


def exponential_fit(points: Sequence[Point]) -> Tuple[float, float]:
    """Fit ``y = a * exp(b x)`` by regressing on log y; returns ``(a, b)``."""
    from .statistics import linear_regression

    data = _check_points(points)
    if any(y <= 0 for _, y in data):
        raise ValueError("exponential fit requires positive y values")
    fit = linear_regression([x for x, _ in data], [math.log(y) for _, y in data])
    return math.exp(fit.intercept), fit.slope


def power_fit(points: Sequence[Point]) -> Tuple[float, float]:
    """Fit ``y = a * x ** b`` on a log-log scale; returns ``(a, b)``."""
    from .statistics import linear_regression

    data = _check_points(points)
    if any(x <= 0 or y <= 0 for x, y in data):
        raise ValueError("power fit requires positive x and y values")
    fit = linear_regression(
        [math.log(x) for x, _ in data], [math.log(y) for _, y in data]
    )
    return math.exp(fit.intercept), fit.slope
