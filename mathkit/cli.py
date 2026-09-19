"""Command line interface for :mod:`mathkit`.

Run ``python -m mathkit --help`` for the list of commands, or
``python -m mathkit repl`` for an interactive session.
"""

from __future__ import annotations

import argparse
import math
import re
import sys
from typing import Callable, Dict, List, Sequence

from . import algebra, calculus, expression, geometry, interpolation
from . import linalg, numbertheory, plotting, statistics
from .expression import ParseError, compile_function, parse

__all__ = ["main", "build_parser"]


# --------------------------------------------------------------------------
# Shared helpers
# --------------------------------------------------------------------------


def _variables(assignments: Sequence[str] | None) -> Dict[str, float]:
    """Turn ``["x=1", "y=2.5"]`` into ``{"x": 1.0, "y": 2.5}``."""
    result: Dict[str, float] = {}
    for item in assignments or []:
        if "=" not in item:
            raise SystemExit(f"error: expected NAME=VALUE, got {item!r}")
        name, _, value = item.partition("=")
        try:
            result[name.strip()] = float(expression.evaluate(value.strip()))
        except (ParseError, ValueError, NameError) as error:
            raise SystemExit(f"error: bad value for {name.strip()!r}: {error}")
    return result


def _function(source: str, variable: str) -> Callable[[float], float]:
    return compile_function(parse(source), variable)


def _number(text: str) -> float:
    """Parse a CLI numeric argument, allowing expressions such as ``pi/2``."""
    lowered = text.strip().lower()
    if lowered in {"inf", "+inf", "infinity"}:
        return math.inf
    if lowered in {"-inf", "-infinity"}:
        return -math.inf
    return float(expression.evaluate(text))


def _matrix(rows: Sequence[str]) -> linalg.Matrix:
    """Build a matrix from rows given as ``"1,2;3,4"`` or separate arguments."""
    joined = ";".join(rows)
    parsed = [
        [_number(cell) for cell in row.replace(",", " ").split()]
        for row in joined.split(";")
        if row.strip()
    ]
    return linalg.Matrix(parsed)


def _format_complex(z: complex, places: int = 10) -> str:
    real = z.real + 0.0 if z.real else 0.0  # normalize -0.0 away
    if abs(z.imag) < 1e-12:
        return f"{real:.{places}g}"
    sign = "+" if z.imag >= 0 else "-"
    return f"{real:.{places}g} {sign} {abs(z.imag):.{places}g}i"


# --------------------------------------------------------------------------
# Commands
# --------------------------------------------------------------------------


def cmd_eval(args: argparse.Namespace) -> int:
    """Evaluate an expression."""
    value = expression.evaluate(args.expression, _variables(args.var))
    print(f"{value:.12g}")
    return 0


def cmd_simplify(args: argparse.Namespace) -> int:
    """Simplify an expression symbolically."""
    print(expression.simplify(parse(args.expression)))
    return 0


def cmd_diff(args: argparse.Namespace) -> int:
    """Differentiate an expression symbolically, and optionally evaluate it."""
    tree = parse(args.expression)
    if args.numeric:
        f = compile_function(tree, args.variable)
        if args.at is None:
            raise SystemExit("error: --numeric requires --at")
        value = calculus.nth_derivative(f, args.at, args.order)
        print(f"{value:.12g}")
        return 0

    derivative = expression.differentiate(tree, args.variable, args.order)
    operator = (
        f"d/d{args.variable}"
        if args.order == 1
        else f"d^{args.order}/d{args.variable}^{args.order}"
    )
    print(f"{operator} [{tree}] = {derivative}")
    if args.at is not None:
        variables = _variables(args.var)
        variables[args.variable] = args.at
        print(f"at {args.variable} = {args.at:g}: {derivative.evaluate(variables):.12g}")
    return 0


def cmd_integrate(args: argparse.Namespace) -> int:
    """Compute a definite integral numerically."""
    f = _function(args.expression, args.variable)
    value = calculus.integrate(f, args.lower, args.upper, method=args.method)
    print(f"integral of {args.expression} d{args.variable} "
          f"from {args.lower:g} to {args.upper:g} = {value:.12g}")
    return 0


def cmd_limit(args: argparse.Namespace) -> int:
    """Estimate a limit."""
    f = _function(args.expression, args.variable)
    try:
        value = calculus.limit(f, args.point, args.side)
    except ValueError as error:
        print(f"limit does not exist: {error}")
        return 1
    print(f"lim {args.variable} -> {args.point:g} [{args.expression}] = {value:.12g}")
    return 0


def _taylor_coefficients(source: str, variable: str, centre: float, order: int
                         ) -> List[float]:
    """Taylor coefficients, symbolically where the rules allow it."""
    try:
        tree = parse(source)
        coefficients = []
        for n in range(order + 1):
            derivative = expression.differentiate(tree, variable, n)
            coefficients.append(
                derivative.evaluate({variable: centre}) / math.factorial(n)
            )
        return coefficients
    except (ValueError, NameError, ZeroDivisionError, OverflowError, ParseError):
        return calculus.taylor_coefficients(
            compile_function(source, variable), centre, order
        )


def cmd_taylor(args: argparse.Namespace) -> int:
    """Print the Taylor series of an expression."""
    coefficients = _taylor_coefficients(
        args.expression, args.variable, args.at, args.order
    )
    terms: List[str] = []
    for power, coefficient in enumerate(coefficients):
        if abs(coefficient) < 1e-9:
            continue
        rounded = round(coefficient, 9)
        if power == 0:
            terms.append(f"{rounded:g}")
        else:
            shift = args.variable if args.at == 0 else f"({args.variable} - {args.at:g})"
            body = shift if power == 1 else f"{shift}^{power}"
            if abs(abs(rounded) - 1.0) < 1e-12:
                terms.append(f"-{body}" if rounded < 0 else body)
            else:
                terms.append(f"{rounded:g}*{body}")
    print(" + ".join(terms).replace("+ -", "- ") if terms else "0")
    return 0


def cmd_solve(args: argparse.Namespace) -> int:
    """Find the real roots of an expression over an interval."""
    f = _function(args.expression, args.variable)
    roots = algebra.find_all_roots(f, args.lower, args.upper, args.samples)
    if not roots:
        print(f"no sign change found on [{args.lower:g}, {args.upper:g}]")
        return 1
    for root in roots:
        print(f"{args.variable} = {root:.12g}")
    return 0


def cmd_roots(args: argparse.Namespace) -> int:
    """Find every root of a polynomial given by its coefficients."""
    coefficients = [_number(c) for c in args.coefficients]
    if args.descending:
        coefficients = coefficients[::-1]
    polynomial = algebra.Polynomial(coefficients)
    print(f"p(x) = {polynomial}")
    for root in polynomial.roots():
        print(f"  x = {_format_complex(root)}")
    return 0


def cmd_poly(args: argparse.Namespace) -> int:
    """Inspect a polynomial: value, derivative, integral and roots."""
    coefficients = [_number(c) for c in args.coefficients]
    if args.descending:
        coefficients = coefficients[::-1]
    p = algebra.Polynomial(coefficients)
    print(f"p(x)      = {p}")
    print(f"degree    = {p.degree}")
    print(f"p'(x)     = {p.derivative()}")
    print(f"integral  = {p.antiderivative()} + C")
    print("roots     = " + ", ".join(_format_complex(r) for r in p.roots()))
    if args.at is not None:
        print(f"{f'p({args.at:g})':<9} = {p(args.at):.12g}")
    if args.range:
        low, high = args.range
        print(f"area over [{low:g}, {high:g}] = {p.integrate(low, high):.12g}")
    return 0


def cmd_matrix(args: argparse.Namespace) -> int:
    """Analyse a matrix: determinant, inverse, rank, eigenvalues and more."""
    matrix = _matrix(args.rows)
    print("A =")
    print(matrix)
    rows, columns = matrix.shape
    print(f"\nshape     = {rows} x {columns}")
    print(f"rank      = {matrix.rank()}")
    print("transpose =")
    print(matrix.transpose())
    if rows == columns:
        determinant = matrix.determinant()
        print(f"\ntrace       = {matrix.trace():.12g}")
        print(f"determinant = {determinant:.12g}")
        if abs(determinant) > 1e-12:
            print("inverse =")
            print(matrix.inverse())
        else:
            print("inverse     = none (matrix is singular)")
        try:
            eigenvalues = matrix.eigenvalues()
            print("eigenvalues = " + ", ".join(f"{v:.10g}" for v in eigenvalues))
        except (ValueError, linalg.SingularMatrixError) as error:
            print(f"eigenvalues = unavailable ({error})")
    if args.solve:
        constants = [_number(value) for value in args.solve]
        try:
            solution = matrix.solve(constants)
        except (ValueError, linalg.SingularMatrixError) as error:
            print(f"\nsolve: {error}")
            return 1
        print("\nsolution of A x = b:")
        for i, value in enumerate(solution):
            print(f"  x{i + 1} = {value:.12g}")
    return 0


def cmd_stats(args: argparse.Namespace) -> int:
    """Summarize a sample of numbers."""
    data = [_number(value) for value in args.numbers]
    for name, value in statistics.summary(data).items():
        print(f"{name:>9} = {value:.10g}")
    print(f"{'mode':>9} = " + ", ".join(f"{m:g}" for m in statistics.mode(data)))
    if len(data) > 2:
        low, high = statistics.confidence_interval(data)
        print(f"{'95% CI':>9} = [{low:.10g}, {high:.10g}]")
    if args.histogram:
        print()
        print(plotting.histogram(data, args.bins))
    return 0


def cmd_regress(args: argparse.Namespace) -> int:
    """Fit a line or polynomial through x,y pairs."""
    points = []
    for item in args.points:
        x, _, y = item.partition(",")
        if not y:
            raise SystemExit(f"error: expected X,Y pairs, got {item!r}")
        points.append((_number(x), _number(y)))

    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    if args.degree == 1:
        fit = statistics.linear_regression(xs, ys)
        print(fit)
        print(f"correlation = {statistics.correlation(xs, ys):.10g}")
    else:
        coefficients = statistics.polynomial_regression(xs, ys, args.degree)
        print(f"p(x) = {algebra.Polynomial(coefficients)}")
    return 0


def cmd_primes(args: argparse.Namespace) -> int:
    """List primes up to a limit."""
    primes = numbertheory.primes_up_to(args.limit)
    print(f"{len(primes)} primes up to {args.limit}")
    if not args.count_only:
        line: List[str] = []
        for prime in primes:
            line.append(str(prime))
            if len(line) == 12:
                print(" ".join(value.rjust(7) for value in line))
                line = []
        if line:
            print(" ".join(value.rjust(7) for value in line))
    return 0


def cmd_factor(args: argparse.Namespace) -> int:
    """Factorize integers and report their divisor structure."""
    for value in args.numbers:
        n = int(value)
        factors = numbertheory.factorize(n)
        rendered = " * ".join(
            f"{prime}^{power}" if power > 1 else str(prime)
            for prime, power in sorted(factors.items())
        )
        print(f"{n} = {rendered or '1'}")
        print(f"    prime      : {numbertheory.is_prime(n)}")
        if n > 0:
            print(f"    divisors   : {numbertheory.divisors(n)}")
            print(f"    sigma      : {numbertheory.divisor_sum(n)}")
            print(f"    totient    : {numbertheory.totient(n)}")
    return 0


def cmd_gcd(args: argparse.Namespace) -> int:
    """Greatest common divisor and least common multiple."""
    values = [int(v) for v in args.numbers]
    print(f"gcd = {numbertheory.gcd(*values)}")
    print(f"lcm = {numbertheory.lcm(*values)}")
    if len(values) == 2:
        g, x, y = numbertheory.extended_gcd(*values)
        print(f"Bezout: {values[0]}*({x}) + {values[1]}*({y}) = {g}")
    return 0


def cmd_sequence(args: argparse.Namespace) -> int:
    """Print terms of a classic integer sequence."""
    name = args.name
    n = args.n
    if name == "fibonacci":
        print(" ".join(str(v) for v in numbertheory.fibonacci_sequence(n)))
    elif name == "primes":
        print(" ".join(str(numbertheory.nth_prime(i)) for i in range(1, n + 1)))
    elif name == "catalan":
        print(" ".join(str(numbertheory.catalan(i)) for i in range(n)))
    elif name == "collatz":
        sequence = numbertheory.collatz(n)
        print(" ".join(str(v) for v in sequence))
        print(f"({len(sequence) - 1} steps, peak {max(sequence)})")
    elif name == "harmonic":
        for k in range(1, n + 1):
            value = numbertheory.harmonic_number(k)
            print(f"H({k}) = {value} = {float(value):.10f}")
    elif name == "bernoulli":
        for k in range(n + 1):
            print(f"B({k}) = {numbertheory.bernoulli(k)}")
    elif name == "triangular":
        print(" ".join(str(k * (k + 1) // 2) for k in range(1, n + 1)))
    else:  # pragma: no cover - argparse restricts the choices
        raise SystemExit(f"unknown sequence {name!r}")
    return 0


def cmd_convert(args: argparse.Namespace) -> int:
    """Convert an integer between bases."""
    value = int(args.number, args.from_base)
    print(f"{args.number} (base {args.from_base}) = "
          f"{numbertheory.to_base(value, args.to_base)} (base {args.to_base})")
    print(f"decimal = {value}")
    return 0


def cmd_triangle(args: argparse.Namespace) -> int:
    """Solve a triangle from three sides, or two sides and the angle between."""
    if args.angle is None:
        if args.c is None:
            raise SystemExit("error: give three sides, or two sides and --angle")
        result = geometry.solve_triangle_sss(args.a, args.b, args.c)
    else:
        result = geometry.solve_triangle_sas(args.a, args.angle, args.b)
    a, b, c = result["sides"]
    alpha, beta, gamma = result["angles"]
    print(f"sides     : a = {a:.10g}, b = {b:.10g}, c = {c:.10g}")
    print(f"angles    : A = {alpha:.6f}deg, B = {beta:.6f}deg, C = {gamma:.6f}deg")
    print(f"perimeter : {result['perimeter']:.10g}")
    print(f"area      : {result['area']:.10g}")
    print(f"right     : {geometry.is_right_triangle(a, b, c)}")
    return 0


def cmd_polygon(args: argparse.Namespace) -> int:
    """Area, perimeter, centroid and hull of a polygon given by its vertices."""
    vertices = []
    for item in args.vertices:
        x, _, y = item.partition(",")
        if not y:
            raise SystemExit(f"error: expected X,Y vertices, got {item!r}")
        vertices.append((_number(x), _number(y)))
    print(f"vertices  : {len(vertices)}")
    print(f"area      : {geometry.polygon_area(vertices):.10g}")
    print(f"perimeter : {geometry.polygon_perimeter(vertices):.10g}")
    cx, cy = geometry.polygon_centroid(vertices)
    print(f"centroid  : ({cx:.10g}, {cy:.10g})")
    hull = geometry.convex_hull(vertices)
    print(f"hull      : {', '.join(f'({x:g}, {y:g})' for x, y in hull)}")
    print(f"convex    : {len(hull) == len(vertices)}")
    return 0


def cmd_ode(args: argparse.Namespace) -> int:
    """Solve the initial value problem y' = f(t, y)."""
    tree = parse(args.expression)

    def f(t: float, y: float) -> float:
        return tree.evaluate({"t": t, "y": y})

    trajectory = calculus.solve_ode(f, args.y0, args.t0, args.t1, args.steps, args.method)
    print(f"y' = {args.expression},  y({args.t0:g}) = {args.y0:g}  [{args.method}]")
    print(f"{'t':>14}  {'y':>18}")
    print(f"{'-' * 14}  {'-' * 18}")
    stride = max(1, len(trajectory) // max(1, args.rows))
    shown = trajectory[::stride]
    if shown[-1] is not trajectory[-1]:
        shown.append(trajectory[-1])
    for t, y in shown:
        print(f"{t:>14.6g}  {y:>18.10g}")
    return 0


def cmd_plot(args: argparse.Namespace) -> int:
    """Draw an ASCII graph of an expression."""
    f = _function(args.expression, args.variable)
    print(plotting.plot(f, args.lower, args.upper, args.width, args.height, args.expression))
    return 0


def cmd_table(args: argparse.Namespace) -> int:
    """Print a table of values for an expression."""
    f = _function(args.expression, args.variable)
    print(plotting.table(f, args.lower, args.upper, args.steps, args.expression))
    return 0


def cmd_interpolate(args: argparse.Namespace) -> int:
    """Interpolate through data points and evaluate the result."""
    points = []
    for item in args.points:
        x, _, y = item.partition(",")
        if not y:
            raise SystemExit(f"error: expected X,Y pairs, got {item!r}")
        points.append((_number(x), _number(y)))

    methods = {
        "lagrange": interpolation.lagrange,
        "newton": interpolation.newton_divided_differences,
        "linear": interpolation.linear_interpolation,
        "spline": interpolation.cubic_spline,
    }
    f = methods[args.method](points)
    polynomial = algebra.Polynomial.interpolate(points)
    if args.method in {"lagrange", "newton"}:
        print(f"p(x) = {polynomial}")
    if args.at is not None:
        print(f"f({args.at:g}) = {f(args.at):.12g}")
    else:
        low = min(x for x, _ in points)
        high = max(x for x, _ in points)
        print(plotting.table(f, low, high, 10, f"{args.method} fit"))
    return 0


def cmd_repl(args: argparse.Namespace) -> int:
    """Start the interactive calculator."""
    return run_repl()


# --------------------------------------------------------------------------
# Interactive mode
# --------------------------------------------------------------------------

_REPL_HELP = """\
Interactive mathkit calculator.

  <expression>        evaluate, e.g. 2 + 3*4, sin(pi/2), sqrt(2)**2
  x = <expression>    store a variable for later expressions
  d/dx <expression>   symbolic derivative with respect to x
  int <expr> a b      definite integral of expr over [a, b]
  solve <expr> a b    real roots of expr on [a, b]
  plot <expr> a b     ASCII graph of expr over [a, b]
  vars                list stored variables
  help                show this message
  quit                leave (also: exit, Ctrl-D)

Constants pi, e and tau are always available, along with the usual
functions: sin cos tan asin acos atan sinh cosh tanh exp ln log log10
sqrt cbrt abs floor ceil gamma erf.
"""


def run_repl() -> int:
    """Run the read-eval-print loop until the user quits."""
    print("mathkit interactive calculator — type 'help' for commands, 'quit' to exit")
    memory: Dict[str, float] = {}

    while True:
        try:
            line = input(">>> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return 0
        if not line:
            continue

        lowered = line.lower()
        if lowered in {"quit", "exit"}:
            return 0
        if lowered in {"help", "?"}:
            print(_REPL_HELP)
            continue
        if lowered == "vars":
            if memory:
                for name, value in sorted(memory.items()):
                    print(f"  {name} = {value:.12g}")
            else:
                print("  (no variables stored)")
            continue

        try:
            print(_evaluate_repl_line(line, memory))
        except (ParseError, ValueError, NameError, ZeroDivisionError,
                OverflowError, ArithmeticError) as error:
            print(f"error: {error}")


def _evaluate_repl_line(line: str, memory: Dict[str, float]) -> str:
    """Interpret one REPL line and return the text to display."""
    words = line.split()
    head = words[0].lower()

    if head.startswith("d/d") and len(head) > 3:
        variable = head[3:]
        body = line[len(words[0]):].strip()
        derivative = expression.differentiate(body, variable)
        return f"d/d{variable} [{body}] = {derivative}"

    if head in {"int", "integrate"} and len(words) >= 4:
        lower, upper = _number(words[-2]), _number(words[-1])
        body = " ".join(words[1:-2])
        value = calculus.integrate(_function(body, "x"), lower, upper)
        return f"= {value:.12g}"

    if head == "solve" and len(words) >= 4:
        lower, upper = _number(words[-2]), _number(words[-1])
        body = " ".join(words[1:-2])
        roots = algebra.find_all_roots(_function(body, "x"), lower, upper)
        if not roots:
            return "no real roots found in that interval"
        return "\n".join(f"x = {root:.12g}" for root in roots)

    if head == "plot" and len(words) >= 4:
        lower, upper = _number(words[-2]), _number(words[-1])
        body = " ".join(words[1:-2])
        return plotting.plot(_function(body, "x"), lower, upper, label=body)

    if "=" in line and not any(op in line.split("=")[0] for op in "<>!+-*/^("):
        name, _, body = line.partition("=")
        name = name.strip()
        value = expression.evaluate(body.strip(), memory)
        memory[name] = value
        return f"{name} = {value:.12g}"

    value = expression.evaluate(line, memory)
    memory["ans"] = value
    return f"= {value:.12g}"


# --------------------------------------------------------------------------
# Argument parser
# --------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    """Build the full command line parser."""
    parser = argparse.ArgumentParser(
        prog="mathkit",
        description="A mathematics calculator: calculus, algebra, linear "
                    "algebra, number theory, statistics and geometry.",
        epilog="Run 'mathkit repl' for an interactive session.",
    )
    from . import __version__

    parser.add_argument("--version", action="version", version=f"mathkit {__version__}")
    subparsers = parser.add_subparsers(dest="command", metavar="COMMAND")

    def add(name: str, help_text: str, function) -> argparse.ArgumentParser:
        sub = subparsers.add_parser(name, help=help_text, description=help_text)
        sub.set_defaults(function=function)
        return sub

    # -- calculus and expressions -----------------------------------------
    p = add("eval", "Evaluate an expression.", cmd_eval)
    p.add_argument("expression")
    p.add_argument("--var", action="append", metavar="NAME=VALUE",
                   help="bind a variable (repeatable)")

    p = add("simplify", "Simplify an expression symbolically.", cmd_simplify)
    p.add_argument("expression")

    p = add("diff", "Differentiate an expression.", cmd_diff)
    p.add_argument("expression")
    p.add_argument("-v", "--variable", default="x")
    p.add_argument("-n", "--order", type=int, default=1, help="derivative order")
    p.add_argument("--at", type=_number, help="also evaluate at this point")
    p.add_argument("--numeric", action="store_true",
                   help="use a finite difference instead of symbolic rules")
    p.add_argument("--var", action="append", metavar="NAME=VALUE")

    p = add("integrate", "Compute a definite integral.", cmd_integrate)
    p.add_argument("expression")
    p.add_argument("lower", type=_number)
    p.add_argument("upper", type=_number)
    p.add_argument("-v", "--variable", default="x")
    p.add_argument("-m", "--method", default="adaptive",
                   choices=["adaptive", "romberg", "simpson", "trapezoid",
                            "midpoint", "gauss"])

    p = add("limit", "Estimate a limit.", cmd_limit)
    p.add_argument("expression")
    p.add_argument("point", type=_number)
    p.add_argument("-v", "--variable", default="x")
    p.add_argument("-s", "--side", default="both", choices=["both", "left", "right"])

    p = add("taylor", "Expand an expression as a Taylor series.", cmd_taylor)
    p.add_argument("expression")
    p.add_argument("-n", "--order", type=int, default=5)
    p.add_argument("--at", type=_number, default=0.0, help="expansion centre")
    p.add_argument("-v", "--variable", default="x")

    p = add("ode", "Solve y' = f(t, y) numerically.", cmd_ode)
    p.add_argument("expression", help="right-hand side in terms of t and y")
    p.add_argument("--y0", type=_number, required=True, help="initial value y(t0)")
    p.add_argument("--t0", type=_number, default=0.0)
    p.add_argument("--t1", type=_number, required=True)
    p.add_argument("--steps", type=int, default=1000)
    p.add_argument("--rows", type=int, default=10, help="table rows to print")
    p.add_argument("-m", "--method", default="rk4", choices=["rk4", "euler"])

    # -- algebra -----------------------------------------------------------
    p = add("solve", "Find the real roots of an expression.", cmd_solve)
    p.add_argument("expression")
    p.add_argument("lower", type=_number)
    p.add_argument("upper", type=_number)
    p.add_argument("-v", "--variable", default="x")
    p.add_argument("--samples", type=int, default=2000)

    p = add("roots", "Find every root of a polynomial.", cmd_roots)
    p.add_argument("coefficients", nargs="+",
                   help="coefficients in ascending powers, e.g. -6 11 -6 1")
    p.add_argument("-d", "--descending", action="store_true",
                   help="read the coefficients from the highest power down")

    p = add("poly", "Inspect a polynomial.", cmd_poly)
    p.add_argument("coefficients", nargs="+")
    p.add_argument("-d", "--descending", action="store_true")
    p.add_argument("--at", type=_number, help="evaluate at this point")
    p.add_argument("--range", nargs=2, type=_number, metavar=("A", "B"),
                   help="also integrate over [A, B]")

    # -- linear algebra ----------------------------------------------------
    p = add("matrix", "Analyse a matrix.", cmd_matrix)
    p.add_argument("rows", nargs="+", help='rows like "1,2;3,4" or "1 2" "3 4"')
    p.add_argument("--solve", nargs="+", metavar="B",
                   help="also solve A x = b for this right-hand side")

    # -- number theory -----------------------------------------------------
    p = add("primes", "List the primes up to a limit.", cmd_primes)
    p.add_argument("limit", type=int)
    p.add_argument("-c", "--count-only", action="store_true")

    p = add("factor", "Factorize integers.", cmd_factor)
    p.add_argument("numbers", nargs="+")

    p = add("gcd", "Greatest common divisor and least common multiple.", cmd_gcd)
    p.add_argument("numbers", nargs="+")

    p = add("sequence", "Print a classic integer sequence.", cmd_sequence)
    p.add_argument("name", choices=["fibonacci", "primes", "catalan", "collatz",
                                    "harmonic", "bernoulli", "triangular"])
    p.add_argument("n", type=int)

    p = add("convert", "Convert an integer between bases.", cmd_convert)
    p.add_argument("number")
    p.add_argument("--from-base", type=int, default=10)
    p.add_argument("--to-base", type=int, default=2)

    # -- statistics --------------------------------------------------------
    p = add("stats", "Summarize a sample of numbers.", cmd_stats)
    p.add_argument("numbers", nargs="+")
    p.add_argument("--histogram", action="store_true")
    p.add_argument("--bins", type=int, default=10)

    p = add("regress", "Fit a line or polynomial through points.", cmd_regress)
    p.add_argument("points", nargs="+", metavar="X,Y")
    p.add_argument("-n", "--degree", type=int, default=1)

    p = add("interpolate", "Interpolate through data points.", cmd_interpolate)
    p.add_argument("points", nargs="+", metavar="X,Y")
    p.add_argument("-m", "--method", default="lagrange",
                   choices=["lagrange", "newton", "linear", "spline"])
    p.add_argument("--at", type=_number)

    # -- geometry ----------------------------------------------------------
    p = add("triangle", "Solve a triangle.", cmd_triangle)
    p.add_argument("a", type=_number)
    p.add_argument("b", type=_number)
    p.add_argument("c", type=_number, nargs="?")
    p.add_argument("--angle", type=_number,
                   help="the angle in degrees between sides a and b")

    p = add("polygon", "Measure a polygon.", cmd_polygon)
    p.add_argument("vertices", nargs="+", metavar="X,Y")

    # -- output ------------------------------------------------------------
    p = add("plot", "Draw an ASCII graph of an expression.", cmd_plot)
    p.add_argument("expression")
    p.add_argument("lower", type=_number)
    p.add_argument("upper", type=_number)
    p.add_argument("-v", "--variable", default="x")
    p.add_argument("--width", type=int, default=72)
    p.add_argument("--height", type=int, default=22)

    p = add("table", "Tabulate an expression.", cmd_table)
    p.add_argument("expression")
    p.add_argument("lower", type=_number)
    p.add_argument("upper", type=_number)
    p.add_argument("-v", "--variable", default="x")
    p.add_argument("--steps", type=int, default=20)

    add("repl", "Start the interactive calculator.", cmd_repl)

    return parser


# argparse only lets an argument beginning with '-' through as a positional
# when it looks like a negative number, and its built-in pattern covers plain
# digits only. Widen it so '-inf', '-pi' and '-2*pi' reach the commands that
# take interval endpoints.
_NEGATIVE_VALUE = re.compile(r"^-(\d|\.\d|inf|infinity|pi|e\b|tau)", re.IGNORECASE)


def _allow_negative_values(parser: argparse.ArgumentParser) -> None:
    """Apply the widened negative-number pattern to a parser and its children."""
    parser._negative_number_matcher = _NEGATIVE_VALUE  # type: ignore[attr-defined]
    for action in parser._actions:
        if isinstance(action, argparse._SubParsersAction):
            for subparser in action.choices.values():
                _allow_negative_values(subparser)


def main(argv: Sequence[str] | None = None) -> int:
    """Entry point: parse arguments and dispatch to a command."""
    parser = build_parser()
    _allow_negative_values(parser)
    args = parser.parse_args(argv)
    if not getattr(args, "function", None):
        return run_repl() if sys.stdin.isatty() else (parser.print_help() or 0)

    try:
        return args.function(args)
    except ParseError as error:
        print(f"parse error: {error}", file=sys.stderr)
        return 2
    except (ValueError, NameError, ZeroDivisionError, OverflowError,
            ArithmeticError, linalg.SingularMatrixError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:  # pragma: no cover - interactive only
        print()
        return 130
