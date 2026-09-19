"""Polynomials, root finding and equation solving.

    >>> p = Polynomial([-6, 11, -6, 1])   # x^3 - 6x^2 + 11x - 6
    >>> sorted(round(r.real, 6) for r in p.roots())
    [1.0, 2.0, 3.0]
    >>> round(newton(lambda x: x * x - 2, 1.0), 10)
    1.4142135624
"""

from __future__ import annotations

import cmath
import math
from typing import Callable, Iterable, List, Sequence, Tuple

__all__ = [
    "Polynomial",
    "ConvergenceError",
    "bisection",
    "newton",
    "secant",
    "brent",
    "fixed_point",
    "find_root",
    "find_all_roots",
    "quadratic_roots",
    "cubic_roots",
    "solve_linear_system",
    "minimize_golden_section",
]

Function = Callable[[float], float]


class ConvergenceError(RuntimeError):
    """Raised when an iterative method fails to converge."""


# --------------------------------------------------------------------------
# Polynomials
# --------------------------------------------------------------------------


class Polynomial:
    """A univariate polynomial with coefficients in ascending power order.

    ``Polynomial([1, 2, 3])`` represents ``1 + 2x + 3x^2``.
    """

    __slots__ = ("coefficients",)

    def __init__(self, coefficients: Iterable[float]) -> None:
        values = [float(c) for c in coefficients]
        while len(values) > 1 and abs(values[-1]) < 1e-15:
            values.pop()
        self.coefficients = values or [0.0]

    # -- basics ------------------------------------------------------------

    @property
    def degree(self) -> int:
        """Degree of the polynomial; the zero polynomial has degree 0."""
        return len(self.coefficients) - 1

    def __call__(self, x: float) -> float:
        return self.evaluate(x)

    def evaluate(self, x: float) -> float:
        """Evaluate at ``x`` using Horner's method."""
        total = 0.0
        for coefficient in reversed(self.coefficients):
            total = total * x + coefficient
        return total

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Polynomial):
            return NotImplemented
        if self.degree != other.degree:
            return False
        return all(
            math.isclose(a, b, abs_tol=1e-12)
            for a, b in zip(self.coefficients, other.coefficients)
        )

    def __repr__(self) -> str:
        return f"Polynomial({self.coefficients!r})"

    def __str__(self) -> str:
        terms: List[str] = []
        for power, coefficient in reversed(list(enumerate(self.coefficients))):
            if abs(coefficient) < 1e-15 and self.degree > 0:
                continue
            magnitude = abs(coefficient)
            body = "" if (magnitude == 1 and power) else f"{magnitude:.10g}"
            if power == 1:
                body += "x"
            elif power > 1:
                body += f"x^{power}"
            sign = "-" if coefficient < 0 else "+"
            terms.append(f"{sign} {body}" if terms else (f"-{body}" if coefficient < 0 else body))
        return " ".join(terms) if terms else "0"

    # -- arithmetic --------------------------------------------------------

    def __add__(self, other: "Polynomial | float") -> "Polynomial":
        other = other if isinstance(other, Polynomial) else Polynomial([other])
        length = max(len(self.coefficients), len(other.coefficients))
        return Polynomial(
            [
                self.coefficient(i) + other.coefficient(i)
                for i in range(length)
            ]
        )

    __radd__ = __add__

    def __neg__(self) -> "Polynomial":
        return Polynomial([-c for c in self.coefficients])

    def __sub__(self, other: "Polynomial | float") -> "Polynomial":
        other = other if isinstance(other, Polynomial) else Polynomial([other])
        return self + (-other)

    def __rsub__(self, other: float) -> "Polynomial":
        return Polynomial([other]) - self

    def __mul__(self, other: "Polynomial | float") -> "Polynomial":
        if not isinstance(other, Polynomial):
            return Polynomial([c * other for c in self.coefficients])
        result = [0.0] * (self.degree + other.degree + 1)
        for i, a in enumerate(self.coefficients):
            for j, b in enumerate(other.coefficients):
                result[i + j] += a * b
        return Polynomial(result)

    __rmul__ = __mul__

    def __divmod__(self, other: "Polynomial") -> Tuple["Polynomial", "Polynomial"]:
        return self.divide(other)

    def __pow__(self, exponent: int) -> "Polynomial":
        if exponent < 0 or int(exponent) != exponent:
            raise ValueError("exponent must be a non-negative integer")
        result = Polynomial([1.0])
        base = self
        exponent = int(exponent)
        while exponent:
            if exponent & 1:
                result = result * base
            base = base * base
            exponent >>= 1
        return result

    def coefficient(self, power: int) -> float:
        """Coefficient of ``x**power``, or 0.0 beyond the degree."""
        if 0 <= power < len(self.coefficients):
            return self.coefficients[power]
        return 0.0

    def divide(self, divisor: "Polynomial") -> Tuple["Polynomial", "Polynomial"]:
        """Polynomial long division, returning ``(quotient, remainder)``."""
        if divisor.degree == 0 and divisor.coefficients[0] == 0:
            raise ZeroDivisionError("division by the zero polynomial")
        remainder = self.coefficients[:]
        quotient = [0.0] * max(1, self.degree - divisor.degree + 1)
        lead = divisor.coefficients[-1]
        for power in range(self.degree - divisor.degree, -1, -1):
            factor = remainder[power + divisor.degree] / lead
            quotient[power] = factor
            if factor:
                for i, coefficient in enumerate(divisor.coefficients):
                    remainder[power + i] -= factor * coefficient
        return Polynomial(quotient), Polynomial(remainder[: divisor.degree] or [0.0])

    def derivative(self, order: int = 1) -> "Polynomial":
        """The ``order``-th derivative, exactly."""
        result = self
        for _ in range(order):
            result = Polynomial(
                [power * c for power, c in enumerate(result.coefficients)][1:] or [0.0]
            )
        return result

    def antiderivative(self, constant: float = 0.0) -> "Polynomial":
        """An antiderivative with the given integration constant."""
        return Polynomial(
            [constant] + [c / (power + 1) for power, c in enumerate(self.coefficients)]
        )

    def integrate(self, a: float, b: float) -> float:
        """Exact definite integral over [a, b]."""
        antiderivative = self.antiderivative()
        return antiderivative(b) - antiderivative(a)

    def compose(self, other: "Polynomial") -> "Polynomial":
        """Composition ``self(other(x))``."""
        result = Polynomial([0.0])
        for coefficient in reversed(self.coefficients):
            result = result * other + Polynomial([coefficient])
        return result

    def gcd(self, other: "Polynomial", tolerance: float = 1e-9) -> "Polynomial":
        """Monic greatest common divisor via the Euclidean algorithm."""
        a, b = self, other
        while b.degree > 0 or abs(b.coefficients[0]) > tolerance:
            _, remainder = a.divide(b)
            remainder = Polynomial(
                [0.0 if abs(c) < tolerance else c for c in remainder.coefficients]
            )
            a, b = b, remainder
        lead = a.coefficients[-1]
        return Polynomial([c / lead for c in a.coefficients])

    def roots(self, tolerance: float = 1e-12, iterations: int = 500) -> List[complex]:
        """All complex roots via the Durand-Kerner (Weierstrass) method."""
        degree = self.degree
        if degree < 1:
            return []
        if degree == 1:
            return [complex(-self.coefficients[0] / self.coefficients[1], 0.0)]
        if degree == 2:
            return list(quadratic_roots(*reversed(self.coefficients)))

        lead = self.coefficients[-1]
        monic = [c / lead for c in self.coefficients]

        def evaluate(z: complex) -> complex:
            total = 0j
            for coefficient in reversed(monic):
                total = total * z + coefficient
            return total

        seed = complex(0.4, 0.9)
        approximations = [seed ** k for k in range(degree)]
        for _ in range(iterations):
            shift = 0.0
            for i in range(degree):
                numerator = evaluate(approximations[i])
                denominator = 1.0 + 0j
                for j in range(degree):
                    if i != j:
                        denominator *= approximations[i] - approximations[j]
                if denominator == 0:
                    continue
                delta = numerator / denominator
                approximations[i] -= delta
                shift = max(shift, abs(delta))
            if shift < tolerance:
                break

        cleaned = []
        for root in approximations:
            if abs(root.imag) < 1e-8:
                root = complex(root.real, 0.0)
            cleaned.append(root)
        return sorted(cleaned, key=lambda z: (round(z.real, 9), round(z.imag, 9)))

    def real_roots(self, tolerance: float = 1e-8) -> List[float]:
        """Only the real roots, sorted ascending."""
        return sorted(r.real for r in self.roots() if abs(r.imag) < tolerance)

    @classmethod
    def from_roots(cls, roots: Sequence[float]) -> "Polynomial":
        """Build the monic polynomial with the given roots."""
        result = cls([1.0])
        for root in roots:
            result = result * cls([-root, 1.0])
        return result

    @classmethod
    def interpolate(cls, points: Sequence[Tuple[float, float]]) -> "Polynomial":
        """The Lagrange interpolating polynomial through ``points``."""
        if not points:
            raise ValueError("at least one point is required")
        xs = [p[0] for p in points]
        if len(set(xs)) != len(xs):
            raise ValueError("x values must be distinct")
        result = cls([0.0])
        for i, (xi, yi) in enumerate(points):
            term = cls([yi])
            for j, (xj, _) in enumerate(points):
                if i != j:
                    term = term * cls([-xj / (xi - xj), 1.0 / (xi - xj)])
            result = result + term
        return result


# --------------------------------------------------------------------------
# Closed-form small cases
# --------------------------------------------------------------------------


def quadratic_roots(a: float, b: float, c: float) -> Tuple[complex, complex]:
    """Roots of ``ax^2 + bx + c`` using a numerically stable formula."""
    if a == 0:
        if b == 0:
            raise ValueError("not an equation in x")
        root = complex(-c / b, 0.0)
        return root, root
    discriminant = cmath.sqrt(complex(b * b - 4.0 * a * c, 0.0))
    # Pick the sign that adds, so the two terms never cancel catastrophically.
    q = -0.5 * (b + discriminant if b >= 0 else b - discriminant)
    if q == 0:
        return complex(0.0, 0.0), complex(0.0, 0.0)
    return q / a, complex(c, 0.0) / q


def cubic_roots(a: float, b: float, c: float, d: float) -> List[complex]:
    """Roots of ``ax^3 + bx^2 + cx + d`` by Cardano's formula."""
    if a == 0:
        return list(quadratic_roots(b, c, d))
    b, c, d = b / a, c / a, d / a
    # Depressed cubic t^3 + pt + q with x = t - b/3
    p = c - b * b / 3.0
    q = 2.0 * b ** 3 / 27.0 - b * c / 3.0 + d
    offset = -b / 3.0
    if abs(p) < 1e-14 and abs(q) < 1e-14:
        return [complex(offset, 0.0)] * 3
    discriminant = (q / 2.0) ** 2 + (p / 3.0) ** 3
    roots: List[complex] = []
    for k in range(3):
        angle = 2.0 * math.pi * k / 3.0
        u = (-q / 2.0 + cmath.sqrt(complex(discriminant, 0.0))) ** (1.0 / 3.0)
        u *= cmath.exp(1j * angle)
        if abs(u) < 1e-14:
            root = complex(offset, 0.0)
        else:
            root = u - p / (3.0 * u) + offset
        if abs(root.imag) < 1e-9:
            root = complex(root.real, 0.0)
        roots.append(root)
    return sorted(roots, key=lambda z: (round(z.real, 9), round(z.imag, 9)))


# --------------------------------------------------------------------------
# Root finding
# --------------------------------------------------------------------------


def bisection(
    f: Function, a: float, b: float, tolerance: float = 1e-12, iterations: int = 200
) -> float:
    """Find a root of ``f`` in the bracketing interval [a, b]."""
    fa, fb = f(a), f(b)
    if fa == 0:
        return a
    if fb == 0:
        return b
    if fa * fb > 0:
        raise ValueError(f"f(a) and f(b) must have opposite signs (got {fa}, {fb})")
    for _ in range(iterations):
        mid = 0.5 * (a + b)
        fmid = f(mid)
        if fmid == 0 or (b - a) / 2.0 < tolerance:
            return mid
        if fa * fmid < 0:
            b, fb = mid, fmid
        else:
            a, fa = mid, fmid
    return 0.5 * (a + b)


def newton(
    f: Function,
    x0: float,
    derivative: Function | None = None,
    tolerance: float = 1e-12,
    iterations: int = 100,
) -> float:
    """Newton-Raphson root finding; the derivative is estimated if omitted."""
    x = float(x0)
    for _ in range(iterations):
        value = f(x)
        if abs(value) < tolerance:
            return x
        if derivative is not None:
            slope = derivative(x)
        else:
            h = (abs(x) + 1.0) * 1e-7
            slope = (f(x + h) - f(x - h)) / (2.0 * h)
        if abs(slope) < 1e-14:
            raise ConvergenceError(f"derivative vanished near x = {x}")
        step = value / slope
        x -= step
        if abs(step) < tolerance * max(1.0, abs(x)):
            return x
    raise ConvergenceError(f"Newton's method did not converge from x0 = {x0}")


def secant(
    f: Function, x0: float, x1: float, tolerance: float = 1e-12, iterations: int = 200
) -> float:
    """Secant method: Newton without a derivative."""
    f0, f1 = f(x0), f(x1)
    for _ in range(iterations):
        if abs(f1) < tolerance:
            return x1
        if abs(f1 - f0) < 1e-18:
            raise ConvergenceError("secant method stalled")
        x2 = x1 - f1 * (x1 - x0) / (f1 - f0)
        x0, f0, x1, f1 = x1, f1, x2, f(x2)
        if abs(x1 - x0) < tolerance * max(1.0, abs(x1)):
            return x1
    raise ConvergenceError("secant method did not converge")


def brent(
    f: Function, a: float, b: float, tolerance: float = 1e-14, iterations: int = 200
) -> float:
    """Brent's method: bisection's safety with faster interpolation steps."""
    fa, fb = f(a), f(b)
    if fa * fb > 0:
        raise ValueError("f(a) and f(b) must have opposite signs")
    if abs(fa) < abs(fb):
        a, b, fa, fb = b, a, fb, fa
    c, fc = a, fa
    used_bisection = True
    d = b - a
    for _ in range(iterations):
        if fb == 0 or abs(b - a) < tolerance:
            return b
        if fa != fc and fb != fc:
            # Inverse quadratic interpolation.
            s = (
                a * fb * fc / ((fa - fb) * (fa - fc))
                + b * fa * fc / ((fb - fa) * (fb - fc))
                + c * fa * fb / ((fc - fa) * (fc - fb))
            )
        else:
            s = b - fb * (b - a) / (fb - fa)

        lower, upper = sorted(((3 * a + b) / 4.0, b))
        if (
            not lower < s < upper
            or (used_bisection and abs(s - b) >= abs(b - c) / 2.0)
            or (not used_bisection and abs(s - b) >= abs(c - d) / 2.0)
        ):
            s = 0.5 * (a + b)
            used_bisection = True
        else:
            used_bisection = False

        fs = f(s)
        d, c, fc = c, b, fb
        if fa * fs < 0:
            b, fb = s, fs
        else:
            a, fa = s, fs
        if abs(fa) < abs(fb):
            a, b, fa, fb = b, a, fb, fa
    return b


def fixed_point(
    g: Function, x0: float, tolerance: float = 1e-12, iterations: int = 500
) -> float:
    """Solve ``x = g(x)`` by fixed-point iteration."""
    x = float(x0)
    for _ in range(iterations):
        nxt = g(x)
        if abs(nxt - x) < tolerance * max(1.0, abs(nxt)):
            return nxt
        x = nxt
    raise ConvergenceError("fixed-point iteration did not converge")


def find_root(f: Function, a: float, b: float, method: str = "brent") -> float:
    """Find a root of ``f`` bracketed by [a, b] using ``method``."""
    if method == "brent":
        return brent(f, a, b)
    if method == "bisection":
        return bisection(f, a, b)
    if method == "secant":
        return secant(f, a, b)
    if method == "newton":
        return newton(f, 0.5 * (a + b))
    raise ValueError(f"unknown root-finding method {method!r}")


def find_all_roots(
    f: Function, a: float, b: float, samples: int = 1000, tolerance: float = 1e-9
) -> List[float]:
    """Scan [a, b] for sign changes and refine each bracket into a root."""
    if samples < 2:
        raise ValueError("samples must be at least 2")
    roots: List[float] = []
    step = (b - a) / samples
    previous_x = a
    try:
        previous_y = f(a)
    except (ValueError, ZeroDivisionError):
        previous_y = math.nan
    if previous_y == 0:
        roots.append(a)

    for i in range(1, samples + 1):
        x = a + i * step
        try:
            y = f(x)
        except (ValueError, ZeroDivisionError):
            previous_x, previous_y = x, math.nan
            continue
        if y == 0:
            roots.append(x)
        elif not math.isnan(previous_y) and previous_y * y < 0:
            roots.append(brent(f, previous_x, x))
        previous_x, previous_y = x, y

    unique: List[float] = []
    for root in sorted(roots):
        if not unique or abs(root - unique[-1]) > tolerance:
            unique.append(root)
    return unique


def solve_linear_system(
    coefficients: Sequence[Sequence[float]], constants: Sequence[float]
) -> List[float]:
    """Solve a square linear system; a thin wrapper over :mod:`mathkit.linalg`."""
    from .linalg import Matrix

    return Matrix(coefficients).solve(constants)


def minimize_golden_section(
    f: Function, a: float, b: float, tolerance: float = 1e-10
) -> Tuple[float, float]:
    """Minimize a unimodal ``f`` on [a, b]; returns ``(x_min, f(x_min))``."""
    inverse_phi = (math.sqrt(5.0) - 1.0) / 2.0
    c = b - inverse_phi * (b - a)
    d = a + inverse_phi * (b - a)
    fc, fd = f(c), f(d)
    while abs(b - a) > tolerance:
        if fc < fd:
            b, d, fd = d, c, fc
            c = b - inverse_phi * (b - a)
            fc = f(c)
        else:
            a, c, fc = c, d, fd
            d = a + inverse_phi * (b - a)
            fd = f(d)
    x = 0.5 * (a + b)
    return x, f(x)
