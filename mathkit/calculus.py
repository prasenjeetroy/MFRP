"""Numerical calculus: derivatives, integrals, limits, series and ODEs.

Every routine here takes a plain Python callable, so they compose with the
symbolic engine in :mod:`mathkit.expression` via ``compile_function``.

    >>> import math
    >>> round(derivative(math.sin, 0.0), 10)
    1.0
    >>> round(integrate(lambda x: x * x, 0, 1), 10)
    0.3333333333
"""

from __future__ import annotations

import math
from typing import Callable, Dict, List, Sequence, Tuple

__all__ = [
    "derivative",
    "second_derivative",
    "nth_derivative",
    "partial_derivative",
    "gradient",
    "jacobian",
    "hessian",
    "trapezoid",
    "midpoint",
    "simpson",
    "romberg",
    "gauss_legendre",
    "adaptive_simpson",
    "integrate",
    "improper_integral",
    "double_integral",
    "limit",
    "taylor_coefficients",
    "taylor_polynomial",
    "arc_length",
    "surface_of_revolution",
    "euler_method",
    "runge_kutta4",
    "solve_ode",
]

Function = Callable[[float], float]


# --------------------------------------------------------------------------
# Differentiation
# --------------------------------------------------------------------------


def derivative(f: Function, x: float, h: float | None = None, order: int = 4) -> float:
    """Numerical first derivative using a central finite difference.

    ``order`` selects the accuracy: 2 for the classic three-point formula,
    4 for the five-point formula (the default, noticeably more accurate).
    """
    if h is None:
        h = (abs(x) + 1.0) * 1e-5
    if h <= 0:
        raise ValueError("step size h must be positive")
    if order == 2:
        return (f(x + h) - f(x - h)) / (2.0 * h)
    if order == 4:
        return (
            f(x - 2 * h) - 8 * f(x - h) + 8 * f(x + h) - f(x + 2 * h)
        ) / (12.0 * h)
    raise ValueError("order must be 2 or 4")


def second_derivative(f: Function, x: float, h: float | None = None) -> float:
    """Numerical second derivative using a central finite difference."""
    if h is None:
        h = (abs(x) + 1.0) * 1e-4
    return (f(x + h) - 2.0 * f(x) + f(x - h)) / (h * h)


def nth_derivative(f: Function, x: float, n: int, h: float | None = None) -> float:
    """Numerical ``n``-th derivative via the central difference operator.

    Accuracy degrades quickly with ``n``; this is reliable up to about n = 6.
    """
    if n < 0:
        raise ValueError("n must be non-negative")
    if n == 0:
        return f(x)
    if h is None:
        h = (abs(x) + 1.0) * (1e-16 ** (1.0 / (n + 2)))
    total = 0.0
    for k in range(n + 1):
        coefficient = math.comb(n, k) * (-1) ** k
        total += coefficient * f(x + (n / 2.0 - k) * h)
    return total / (h ** n)


def partial_derivative(
    f: Callable[[Sequence[float]], float],
    point: Sequence[float],
    index: int,
    h: float | None = None,
) -> float:
    """Partial derivative of a multivariate ``f`` along coordinate ``index``."""
    point = list(point)
    if h is None:
        h = (abs(point[index]) + 1.0) * 1e-6

    def slice_f(value: float) -> float:
        shifted = list(point)
        shifted[index] = value
        return f(shifted)

    return derivative(slice_f, point[index], h)


def gradient(
    f: Callable[[Sequence[float]], float],
    point: Sequence[float],
    h: float | None = None,
) -> List[float]:
    """Gradient vector of a scalar field at ``point``."""
    return [partial_derivative(f, point, i, h) for i in range(len(point))]


def jacobian(
    functions: Sequence[Callable[[Sequence[float]], float]],
    point: Sequence[float],
    h: float | None = None,
) -> List[List[float]]:
    """Jacobian matrix of a vector-valued function at ``point``."""
    return [gradient(f, point, h) for f in functions]


def hessian(
    f: Callable[[Sequence[float]], float],
    point: Sequence[float],
    h: float = 1e-4,
) -> List[List[float]]:
    """Hessian (second derivative) matrix of a scalar field at ``point``."""
    n = len(point)
    point = list(point)
    matrix = [[0.0] * n for _ in range(n)]

    def shifted(deltas: Dict[int, float]) -> float:
        copy = list(point)
        for index, delta in deltas.items():
            copy[index] += delta
        return f(copy)

    centre = f(point)
    for i in range(n):
        matrix[i][i] = (
            shifted({i: h}) - 2.0 * centre + shifted({i: -h})
        ) / (h * h)
        for j in range(i + 1, n):
            value = (
                shifted({i: h, j: h})
                - shifted({i: h, j: -h})
                - shifted({i: -h, j: h})
                + shifted({i: -h, j: -h})
            ) / (4.0 * h * h)
            matrix[i][j] = matrix[j][i] = value
    return matrix


# --------------------------------------------------------------------------
# Integration
# --------------------------------------------------------------------------


def _check_interval(a: float, b: float, n: int) -> None:
    if n <= 0:
        raise ValueError("number of subintervals must be positive")
    if not math.isfinite(a) or not math.isfinite(b):
        raise ValueError("use improper_integral for infinite limits")


def trapezoid(f: Function, a: float, b: float, n: int = 1000) -> float:
    """Composite trapezoidal rule with ``n`` subintervals."""
    _check_interval(a, b, n)
    h = (b - a) / n
    total = 0.5 * (f(a) + f(b))
    for i in range(1, n):
        total += f(a + i * h)
    return total * h


def midpoint(f: Function, a: float, b: float, n: int = 1000) -> float:
    """Composite midpoint rule — useful when the endpoints are singular."""
    _check_interval(a, b, n)
    h = (b - a) / n
    return h * sum(f(a + (i + 0.5) * h) for i in range(n))


def simpson(f: Function, a: float, b: float, n: int = 1000) -> float:
    """Composite Simpson's rule. ``n`` is rounded up to an even number."""
    _check_interval(a, b, n)
    if n % 2:
        n += 1
    h = (b - a) / n
    total = f(a) + f(b)
    for i in range(1, n):
        total += f(a + i * h) * (4 if i % 2 else 2)
    return total * h / 3.0


def romberg(
    f: Function, a: float, b: float, max_steps: int = 12, tolerance: float = 1e-12
) -> float:
    """Romberg integration: Richardson extrapolation of the trapezoid rule."""
    if max_steps < 1:
        raise ValueError("max_steps must be at least 1")
    table: List[List[float]] = [[0.5 * (b - a) * (f(a) + f(b))]]
    for step in range(1, max_steps):
        n = 2 ** step
        h = (b - a) / n
        interior = sum(f(a + (2 * k - 1) * h) for k in range(1, n // 2 + 1))
        row = [0.5 * table[step - 1][0] + h * interior]
        for j in range(1, step + 1):
            factor = 4.0 ** j
            row.append((factor * row[j - 1] - table[step - 1][j - 1]) / (factor - 1.0))
        table.append(row)
        if abs(row[-1] - table[step - 1][-1]) < tolerance * max(1.0, abs(row[-1])):
            return row[-1]
    return table[-1][-1]


# Gauss-Legendre nodes/weights on [-1, 1], computed once via Newton's method
# on the Legendre polynomials.
def _legendre(n: int, x: float) -> Tuple[float, float]:
    """Return (P_n(x), P_n'(x)) by the standard recurrence."""
    p0, p1 = 1.0, x
    if n == 0:
        return p0, 0.0
    for k in range(2, n + 1):
        p0, p1 = p1, ((2 * k - 1) * x * p1 - (k - 1) * p0) / k
    derivative_value = n * (x * p1 - p0) / (x * x - 1.0)
    return p1, derivative_value


def _gauss_nodes(n: int) -> Tuple[List[float], List[float]]:
    nodes: List[float] = []
    weights: List[float] = []
    for i in range(1, n + 1):
        x = math.cos(math.pi * (i - 0.25) / (n + 0.5))
        for _ in range(100):
            value, slope = _legendre(n, x)
            step = value / slope
            x -= step
            if abs(step) < 1e-15:
                break
        _, slope = _legendre(n, x)
        nodes.append(x)
        weights.append(2.0 / ((1.0 - x * x) * slope * slope))
    return nodes, weights


_GAUSS_CACHE: Dict[int, Tuple[List[float], List[float]]] = {}


def gauss_legendre(f: Function, a: float, b: float, n: int = 12) -> float:
    """Gauss-Legendre quadrature with ``n`` nodes — exact for degree 2n-1."""
    if n < 1:
        raise ValueError("n must be at least 1")
    if n not in _GAUSS_CACHE:
        _GAUSS_CACHE[n] = _gauss_nodes(n)
    nodes, weights = _GAUSS_CACHE[n]
    half = 0.5 * (b - a)
    centre = 0.5 * (b + a)
    return half * sum(w * f(centre + half * x) for x, w in zip(nodes, weights))


def adaptive_simpson(
    f: Function, a: float, b: float, tolerance: float = 1e-10, max_depth: int = 50
) -> float:
    """Adaptive Simpson's rule: refine only where the integrand misbehaves."""

    def simpson_panel(lo: float, hi: float, flo: float, fmid: float, fhi: float) -> float:
        return (hi - lo) * (flo + 4.0 * fmid + fhi) / 6.0

    def recurse(
        lo: float,
        hi: float,
        flo: float,
        fmid: float,
        fhi: float,
        whole: float,
        tol: float,
        depth: int,
    ) -> float:
        mid = 0.5 * (lo + hi)
        left_mid = 0.5 * (lo + mid)
        right_mid = 0.5 * (mid + hi)
        f_left_mid = f(left_mid)
        f_right_mid = f(right_mid)
        left = simpson_panel(lo, mid, flo, f_left_mid, fmid)
        right = simpson_panel(mid, hi, fmid, f_right_mid, fhi)
        if depth <= 0 or abs(left + right - whole) <= 15.0 * tol:
            return left + right + (left + right - whole) / 15.0
        return recurse(lo, mid, flo, f_left_mid, fmid, left, tol / 2.0, depth - 1) + recurse(
            mid, hi, fmid, f_right_mid, fhi, right, tol / 2.0, depth - 1
        )

    mid = 0.5 * (a + b)
    fa, fmid, fb = f(a), f(mid), f(b)
    whole = simpson_panel(a, b, fa, fmid, fb)
    return recurse(a, b, fa, fmid, fb, whole, tolerance, max_depth)


_METHODS: Dict[str, Callable[..., float]] = {
    "trapezoid": trapezoid,
    "midpoint": midpoint,
    "simpson": simpson,
    "gauss": gauss_legendre,
}


def integrate(
    f: Function,
    a: float,
    b: float,
    method: str = "adaptive",
    **kwargs: float,
) -> float:
    """Definite integral of ``f`` from ``a`` to ``b``.

    Methods: ``adaptive`` (default), ``romberg``, ``simpson``, ``trapezoid``,
    ``midpoint`` and ``gauss``. Infinite limits are routed to
    :func:`improper_integral` automatically.
    """
    if a == b:
        return 0.0
    if not math.isfinite(a) or not math.isfinite(b):
        return improper_integral(f, a, b, **kwargs)  # type: ignore[arg-type]
    if b < a:
        return -integrate(f, b, a, method, **kwargs)
    if method == "adaptive":
        return adaptive_simpson(f, a, b, **kwargs)  # type: ignore[arg-type]
    if method == "romberg":
        return romberg(f, a, b, **kwargs)  # type: ignore[arg-type]
    if method in _METHODS:
        return _METHODS[method](f, a, b, **kwargs)
    raise ValueError(f"unknown integration method {method!r}")


def improper_integral(f: Function, a: float, b: float, n: int = 400) -> float:
    """Integrate over a half-infinite or doubly infinite interval.

    Uses the substitutions x = t/(1-t^2) for (-inf, inf) and x = a + t/(1-t)
    for [a, inf), then applies Gauss-Legendre quadrature to the transformed
    (finite) integral.
    """
    if b < a:
        return -improper_integral(f, b, a, n)

    if math.isinf(a) and math.isinf(b):
        def transformed(t: float) -> float:
            denominator = 1.0 - t * t
            return f(t / denominator) * (1.0 + t * t) / (denominator * denominator)

        return gauss_legendre(transformed, -1.0 + 1e-12, 1.0 - 1e-12, n)

    if math.isinf(b):
        def upper(t: float) -> float:
            one_minus = 1.0 - t
            return f(a + t / one_minus) / (one_minus * one_minus)

        return gauss_legendre(upper, 0.0, 1.0 - 1e-12, n)

    if math.isinf(a):
        def lower(t: float) -> float:
            one_minus = 1.0 - t
            return f(b - t / one_minus) / (one_minus * one_minus)

        return gauss_legendre(lower, 0.0, 1.0 - 1e-12, n)

    return integrate(f, a, b)


def double_integral(
    f: Callable[[float, float], float],
    x_range: Tuple[float, float],
    y_range: Tuple[float, float] | Callable[[float], Tuple[float, float]],
    n: int = 24,
) -> float:
    """Integrate ``f(x, y)`` over a rectangle or a region with curved y-bounds.

    ``y_range`` is either a fixed ``(y0, y1)`` pair or a callable mapping x to
    such a pair, which covers regions like the area between two curves.
    """
    x0, x1 = x_range

    def inner(x: float) -> float:
        y0, y1 = y_range(x) if callable(y_range) else y_range
        return gauss_legendre(lambda y: f(x, y), y0, y1, n)

    return gauss_legendre(inner, x0, x1, n)


# --------------------------------------------------------------------------
# Limits and series
# --------------------------------------------------------------------------


def _is_diverging(values: List[float], factor: float = 1.5) -> bool:
    """Whether the tail of ``values`` keeps growing in magnitude without bound."""
    tail = values[-5:]
    if len(tail) < 5 or abs(tail[-1]) < 1e4:
        return False
    return all(
        abs(b) > abs(a) * factor and a * b > 0 for a, b in zip(tail, tail[1:])
    )


def _accelerate(values: List[float], tolerance: float) -> float:
    """Aitken's delta-squared process, applied until the sequence stalls.

    A plain sequence of samples approaches a limit only as fast as the
    underlying error term shrinks; repeated extrapolation removes the
    leading error and converges far closer to the true value.
    """
    best = values[-1]
    current = values
    for _ in range(6):
        if len(current) < 3:
            break
        extrapolated: List[float] = []
        for i in range(len(current) - 2):
            a, b, c = current[i], current[i + 1], current[i + 2]
            denominator = c - 2.0 * b + a
            if abs(denominator) < 1e-300:
                extrapolated.append(c)
                continue
            candidate = a - (b - a) ** 2 / denominator
            if math.isfinite(candidate):
                extrapolated.append(candidate)
        if not extrapolated:
            break
        current = extrapolated
        best = current[-1]
        if len(current) >= 2 and abs(current[-1] - current[-2]) < tolerance * max(
            1.0, abs(current[-1])
        ):
            break
    return best


def limit(f: Function, x: float, side: str = "both", tolerance: float = 1e-9) -> float:
    """Estimate lim f(t) as t approaches ``x`` by Richardson extrapolation.

    ``side`` may be ``"both"``, ``"left"`` or ``"right"``. A two-sided limit
    whose one-sided values disagree raises :class:`ValueError`.
    """
    if side not in {"both", "left", "right"}:
        raise ValueError("side must be 'both', 'left' or 'right'")

    def one_sided(direction: int) -> float:
        # Stop well short of machine epsilon: past roughly h = 1e-6 the
        # samples lose more to cancellation than they gain from being close,
        # so the extrapolation below does the rest of the work.
        h = 0.1
        estimates: List[float] = []
        for _ in range(16):
            try:
                value = f(x + direction * h)
            except (ZeroDivisionError, ValueError, OverflowError):
                h /= 2.0
                continue
            if not math.isfinite(value):
                break
            estimates.append(value)
            h /= 2.0
        if not estimates:
            raise ValueError("function undefined near the limit point")
        if _is_diverging(estimates):
            return math.copysign(math.inf, estimates[-1])
        return _accelerate(estimates, tolerance)

    if side == "left":
        return one_sided(-1)
    if side == "right":
        return one_sided(+1)

    left = one_sided(-1)
    right = one_sided(+1)
    if math.isinf(left) or math.isinf(right):
        # Both sides must run off to the same infinity, or there is no limit.
        if left == right:
            return left
        raise ValueError(f"limit does not exist: left={left!r}, right={right!r}")
    if abs(left - right) > 1e-5 * max(1.0, abs(left), abs(right)):
        raise ValueError(f"limit does not exist: left={left!r}, right={right!r}")
    return 0.5 * (left + right)


def taylor_coefficients(f: Function, centre: float, order: int) -> List[float]:
    """Return [f(a), f'(a), f''(a)/2!, ...] up to ``order`` terms."""
    if order < 0:
        raise ValueError("order must be non-negative")
    coefficients = [f(centre)]
    for n in range(1, order + 1):
        coefficients.append(nth_derivative(f, centre, n) / math.factorial(n))
    return coefficients


def taylor_polynomial(f: Function, centre: float, order: int) -> Function:
    """Return the Taylor polynomial of ``f`` about ``centre`` as a callable."""
    coefficients = taylor_coefficients(f, centre, order)

    def polynomial(x: float) -> float:
        total = 0.0
        for coefficient in reversed(coefficients):
            total = total * (x - centre) + coefficient
        return total

    return polynomial


# --------------------------------------------------------------------------
# Applications
# --------------------------------------------------------------------------


def arc_length(f: Function, a: float, b: float, n: int = 2000) -> float:
    """Length of the curve y = f(x) over [a, b]."""
    return simpson(lambda x: math.sqrt(1.0 + derivative(f, x) ** 2), a, b, n)


def surface_of_revolution(f: Function, a: float, b: float, n: int = 2000) -> float:
    """Area of the surface swept by rotating y = f(x) about the x-axis."""
    return simpson(
        lambda x: 2.0 * math.pi * abs(f(x)) * math.sqrt(1.0 + derivative(f, x) ** 2),
        a,
        b,
        n,
    )


# --------------------------------------------------------------------------
# Ordinary differential equations
# --------------------------------------------------------------------------


def euler_method(
    f: Callable[[float, float], float], y0: float, t0: float, t1: float, steps: int = 1000
) -> List[Tuple[float, float]]:
    """Solve y' = f(t, y) with the explicit Euler method."""
    if steps <= 0:
        raise ValueError("steps must be positive")
    h = (t1 - t0) / steps
    t, y = t0, y0
    trajectory = [(t, y)]
    for _ in range(steps):
        y += h * f(t, y)
        t += h
        trajectory.append((t, y))
    return trajectory


def runge_kutta4(
    f: Callable[[float, float], float], y0: float, t0: float, t1: float, steps: int = 1000
) -> List[Tuple[float, float]]:
    """Solve y' = f(t, y) with the classic fourth-order Runge-Kutta method."""
    if steps <= 0:
        raise ValueError("steps must be positive")
    h = (t1 - t0) / steps
    t, y = t0, y0
    trajectory = [(t, y)]
    for _ in range(steps):
        k1 = f(t, y)
        k2 = f(t + h / 2.0, y + h * k1 / 2.0)
        k3 = f(t + h / 2.0, y + h * k2 / 2.0)
        k4 = f(t + h, y + h * k3)
        y += h * (k1 + 2.0 * k2 + 2.0 * k3 + k4) / 6.0
        t += h
        trajectory.append((t, y))
    return trajectory


def solve_ode(
    f: Callable[[float, float], float],
    y0: float,
    t0: float,
    t1: float,
    steps: int = 1000,
    method: str = "rk4",
) -> List[Tuple[float, float]]:
    """Solve an initial value problem with ``method`` in {'rk4', 'euler'}."""
    if method == "rk4":
        return runge_kutta4(f, y0, t0, t1, steps)
    if method == "euler":
        return euler_method(f, y0, t0, t1, steps)
    raise ValueError(f"unknown ODE method {method!r}")
