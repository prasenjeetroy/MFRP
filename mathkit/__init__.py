"""mathkit — a pure-Python mathematics toolkit and calculator.

The package is organised by branch of mathematics:

=========================== ==================================================
:mod:`mathkit.expression`   parsing, evaluation and symbolic differentiation
:mod:`mathkit.calculus`     derivatives, integrals, limits, series and ODEs
:mod:`mathkit.algebra`      polynomials, root finding and optimization
:mod:`mathkit.linalg`       matrices, vectors, solvers and decompositions
:mod:`mathkit.numbertheory` primes, factorization, modular arithmetic
:mod:`mathkit.statistics`   descriptive statistics, regression, distributions
:mod:`mathkit.geometry`     plane and solid geometry
:mod:`mathkit.interpolation` interpolation and curve fitting
:mod:`mathkit.plotting`     ASCII plots, tables and histograms
=========================== ==================================================

Everything runs on the standard library alone — no third-party dependencies.

    >>> import mathkit
    >>> mathkit.evaluate("2 + 3 * 4")
    14.0
    >>> print(mathkit.differentiate("x**3", "x"))
    3 * x ** 2
    >>> round(mathkit.integrate(lambda x: x ** 2, 0, 3), 10)
    9.0
"""

from . import (
    algebra,
    calculus,
    expression,
    geometry,
    interpolation,
    linalg,
    numbertheory,
    plotting,
    statistics,
)
from .algebra import Polynomial, brent, find_all_roots, newton
from .calculus import derivative, integrate, limit, solve_ode
from .expression import compile_function, differentiate, evaluate, parse, simplify
from .linalg import Matrix
from .numbertheory import factorize, fibonacci, gcd, is_prime, lcm, primes_up_to
from .statistics import linear_regression, mean, median, standard_deviation

__version__ = "1.0.0"

__all__ = [
    "algebra",
    "calculus",
    "expression",
    "geometry",
    "interpolation",
    "linalg",
    "numbertheory",
    "plotting",
    "statistics",
    "Matrix",
    "Polynomial",
    "brent",
    "compile_function",
    "derivative",
    "differentiate",
    "evaluate",
    "factorize",
    "fibonacci",
    "find_all_roots",
    "gcd",
    "integrate",
    "is_prime",
    "lcm",
    "limit",
    "linear_regression",
    "mean",
    "median",
    "newton",
    "parse",
    "primes_up_to",
    "simplify",
    "solve_ode",
    "standard_deviation",
    "__version__",
]
