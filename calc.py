#!/usr/bin/env python3
"""A mathematics calculator in pure Python - no third-party dependencies.

Covers symbolic differentiation, numerical integration, limits, series,
differential equations, polynomials and root finding, matrices, number
theory, statistics, geometry and ASCII plotting.

    python3 calc.py                      interactive calculator
    python3 calc.py --help               list every command
    python3 calc.py diff "x**3*exp(x)" --at 1
    python3 calc.py integrate "exp(-x**2)" -inf inf
    python3 calc.py plot "sin(x)/x" -20 20

Needs Python 3.9 or newer (it uses math.gcd and math.lcm with several
arguments, which arrived in 3.9).
"""

import argparse
import cmath
import math
import random
import re
import sys
from fractions import Fraction

# ===========================================================================
# 1. EXPRESSIONS - tokenizer, parser, evaluator, simplifier, derivatives
# ===========================================================================

CONSTANTS = {"pi": math.pi, "e": math.e, "tau": math.tau, "inf": math.inf}

FUNCTIONS = {
    "sin": math.sin, "cos": math.cos, "tan": math.tan,
    "asin": math.asin, "acos": math.acos, "atan": math.atan,
    "sinh": math.sinh, "cosh": math.cosh, "tanh": math.tanh,
    "exp": math.exp, "ln": math.log, "log10": math.log10, "log2": math.log2,
    "log": lambda x, base=math.e: math.log(x, base),
    "sqrt": math.sqrt, "cbrt": lambda x: math.copysign(abs(x) ** (1 / 3), x),
    "abs": abs, "sign": lambda x: math.copysign(1.0, x) if x else 0.0,
    "floor": math.floor, "ceil": math.ceil, "gamma": math.gamma,
    "erf": math.erf, "erfc": math.erfc, "hypot": math.hypot,
    "degrees": math.degrees, "radians": math.radians, "max": max, "min": min,
}


class ParseError(ValueError):
    """Raised when an expression cannot be tokenized or parsed."""


def tokenize(source):
    """Split source into (kind, text, position) tuples."""
    tokens, i, n = [], 0, len(source)
    while i < n:
        c = source[i]
        if c.isspace():
            i += 1
        elif c.isdigit() or (c == "." and i + 1 < n and source[i + 1].isdigit()):
            start, seen_dot = i, False
            while i < n and (source[i].isdigit() or source[i] == "."):
                if source[i] == ".":
                    if seen_dot:
                        raise ParseError("malformed number at position %d" % start)
                    seen_dot = True
                i += 1
            if i < n and source[i] in "eE":                 # scientific notation
                j = i + 1
                if j < n and source[j] in "+-":
                    j += 1
                if j < n and source[j].isdigit():
                    i = j
                    while i < n and source[i].isdigit():
                        i += 1
            tokens.append(("number", source[start:i], start))
        elif c.isalpha() or c == "_":
            start = i
            while i < n and (source[i].isalnum() or source[i] == "_"):
                i += 1
            tokens.append(("name", source[start:i], start))
        elif source.startswith("**", i):
            tokens.append(("op", "^", i))
            i += 2
        elif c in "+-*/%^(),":
            tokens.append(("op", c, i))
            i += 1
        else:
            raise ParseError("unexpected character %r at position %d" % (c, i))
    tokens.append(("end", "", n))
    return tokens


class Node:
    """Base class for nodes of the expression tree."""

    precedence = 100

    def __call__(self, **values):
        return self.evaluate(values)

    def _render(self, parent):
        text = str(self)
        return "(%s)" % text if self.precedence < parent else text


class Number(Node):
    """A literal number."""

    def __init__(self, value):
        self.value = float(value)

    def evaluate(self, variables=None):
        return self.value

    def variables(self):
        return set()

    def __str__(self):
        if self.value == int(self.value) and abs(self.value) < 1e16:
            return str(int(self.value))
        return repr(self.value)


class Variable(Node):
    """A named variable, or one of the built-in constants."""

    def __init__(self, name):
        self.name = name

    def evaluate(self, variables=None):
        variables = variables or {}
        if self.name in variables:
            return float(variables[self.name])
        if self.name in CONSTANTS:
            return CONSTANTS[self.name]
        raise NameError("unknown variable %r" % self.name)

    def variables(self):
        return set() if self.name in CONSTANTS else {self.name}

    def __str__(self):
        return self.name


class UnaryOp(Node):
    """Negation."""

    precedence = 3

    def __init__(self, op, operand):
        self.op, self.operand = op, operand

    def evaluate(self, variables=None):
        value = self.operand.evaluate(variables)
        return -value if self.op == "-" else value

    def variables(self):
        return self.operand.variables()

    def __str__(self):
        return "%s%s" % (self.op, self.operand._render(self.precedence + 1))


PRECEDENCE = {"+": 1, "-": 1, "*": 2, "/": 2, "%": 2, "^": 4}


class BinaryOp(Node):
    """A binary operation: + - * / % or ^ (which also spells **)."""

    def __init__(self, op, left, right):
        self.op, self.left, self.right = op, left, right

    @property
    def precedence(self):
        return PRECEDENCE[self.op]

    def evaluate(self, variables=None):
        a = self.left.evaluate(variables)
        b = self.right.evaluate(variables)
        if self.op == "+":
            return a + b
        if self.op == "-":
            return a - b
        if self.op == "*":
            return a * b
        if self.op == "/":
            if b == 0:
                raise ZeroDivisionError("division by zero in expression")
            return a / b
        if self.op == "%":
            return math.fmod(a, b)
        if self.op == "^":
            if a < 0 and b != int(b):
                raise ValueError("negative base with fractional exponent")
            return a ** b
        raise ParseError("unknown operator %r" % self.op)

    def variables(self):
        return self.left.variables() | self.right.variables()

    def __str__(self):
        p = self.precedence
        # '-', '/' and '^' need parentheses around an equal-precedence right
        # operand, since they do not associate the way flat text implies.
        left = self.left._render(p)
        right = self.right._render(p + 1 if self.op in "-/^" else p)
        return "%s %s %s" % (left, "**" if self.op == "^" else self.op, right)


class Call(Node):
    """A function call such as sin(x) or log(x, 2)."""

    def __init__(self, name, args):
        self.name, self.args = name, tuple(args)

    def evaluate(self, variables=None):
        function = FUNCTIONS.get(self.name)
        if function is None:
            raise NameError("unknown function %r" % self.name)
        return float(function(*(a.evaluate(variables) for a in self.args)))

    def variables(self):
        result = set()
        for arg in self.args:
            result |= arg.variables()
        return result

    def __str__(self):
        return "%s(%s)" % (self.name, ", ".join(str(a) for a in self.args))


class Parser:
    """Recursive-descent parser over the token list."""

    def __init__(self, tokens):
        self.tokens, self.index = tokens, 0

    @property
    def current(self):
        return self.tokens[self.index]

    def advance(self):
        token = self.tokens[self.index]
        self.index += 1
        return token

    def expect(self, text):
        kind, value, position = self.current
        if kind == "op" and value == text:
            return self.advance()
        raise ParseError("expected %r at position %d" % (text, position))

    def parse(self):
        node = self.sum()
        kind, value, position = self.current
        if kind != "end":
            raise ParseError("unexpected %r at position %d" % (value, position))
        return node

    def sum(self):
        node = self.product()
        while self.current[0] == "op" and self.current[1] in "+-":
            node = BinaryOp(self.advance()[1], node, self.product())
        return node

    def product(self):
        node = self.unary()
        while self.current[0] == "op" and self.current[1] in "*/%":
            node = BinaryOp(self.advance()[1], node, self.unary())
        return node

    def unary(self):
        if self.current[0] == "op" and self.current[1] in "+-":
            op = self.advance()[1]
            operand = self.unary()
            if op == "-":
                return Number(-operand.value) if isinstance(operand, Number) \
                    else UnaryOp("-", operand)
            return operand
        return self.power()

    def power(self):
        base = self.atom()
        if self.current[0] == "op" and self.current[1] == "^":
            self.advance()
            return BinaryOp("^", base, self.unary())   # right associative
        return base

    def atom(self):
        kind, text, position = self.current
        if kind == "number":
            self.advance()
            return Number(float(text))
        if kind == "name":
            self.advance()
            if self.current[0] == "op" and self.current[1] == "(":
                self.advance()
                args = []
                if not (self.current[0] == "op" and self.current[1] == ")"):
                    args.append(self.sum())
                    while self.current[0] == "op" and self.current[1] == ",":
                        self.advance()
                        args.append(self.sum())
                self.expect(")")
                return Call(text, args)
            return Variable(text)
        if kind == "op" and text == "(":
            self.advance()
            node = self.sum()
            self.expect(")")
            return node
        raise ParseError("unexpected %r at position %d"
                         % (text or "end of input", position))


def parse(source):
    """Parse a string into an expression tree."""
    if not source or not source.strip():
        raise ParseError("empty expression")
    return Parser(tokenize(source)).parse()


def evaluate(source, variables=None):
    """Evaluate an expression string (or tree) with the given variables."""
    node = parse(source) if isinstance(source, str) else source
    return node.evaluate(variables)


def compile_function(source, variable="x"):
    """Turn an expression into a one-argument Python callable."""
    node = parse(source) if isinstance(source, str) else source
    return lambda value: node.evaluate({variable: value})


def is_number(node, value):
    """Whether node is exactly the given numeric literal."""
    return isinstance(node, Number) and node.value == value


def simplify(node):
    """Fold constants and apply algebraic identities."""
    if isinstance(node, (Number, Variable)):
        return node
    if isinstance(node, UnaryOp):
        operand = simplify(node.operand)
        if isinstance(operand, Number):
            return Number(-operand.value)
        if isinstance(operand, UnaryOp) and operand.op == "-":
            return operand.operand
        return UnaryOp(node.op, operand)
    if isinstance(node, Call):
        args = tuple(simplify(a) for a in node.args)
        if all(isinstance(a, Number) for a in args):
            try:
                return Number(Call(node.name, args).evaluate())
            except (ValueError, ZeroDivisionError, OverflowError, NameError):
                pass
        return Call(node.name, args)

    left, right, op = simplify(node.left), simplify(node.right), node.op
    if isinstance(left, Number) and isinstance(right, Number):
        try:
            return Number(BinaryOp(op, left, right).evaluate())
        except (ValueError, ZeroDivisionError, OverflowError):
            return BinaryOp(op, left, right)

    if op == "+":
        if is_number(left, 0):
            return right
        if is_number(right, 0):
            return left
        if isinstance(right, Number) and right.value < 0:     # a + -3 -> a - 3
            return BinaryOp("-", left, Number(-right.value))
        if isinstance(right, UnaryOp) and right.op == "-":
            return simplify(BinaryOp("-", left, right.operand))
        if isinstance(left, UnaryOp) and left.op == "-":
            return simplify(BinaryOp("-", right, left.operand))
    elif op == "-":
        if isinstance(right, UnaryOp) and right.op == "-":
            return simplify(BinaryOp("+", left, right.operand))
        if is_number(right, 0):
            return left
        if is_number(left, 0):
            return simplify(UnaryOp("-", right))
        if str(left) == str(right):
            return Number(0)
    elif op == "*":
        if is_number(left, 0) or is_number(right, 0):
            return Number(0)
        if is_number(left, 1):
            return right
        if is_number(right, 1):
            return left
        if is_number(left, -1):
            return simplify(UnaryOp("-", right))
        if is_number(right, -1):
            return simplify(UnaryOp("-", left))
        if isinstance(left, UnaryOp) and left.op == "-":      # pull sign out
            return simplify(UnaryOp("-", BinaryOp("*", left.operand, right)))
        if isinstance(right, UnaryOp) and right.op == "-":
            return simplify(UnaryOp("-", BinaryOp("*", left, right.operand)))
        folded = fold_product(left, right)                    # 3*(2*x) -> 6*x
        if folded is not None:
            return folded
        if isinstance(right, Number) and not isinstance(left, Number):
            return BinaryOp("*", right, left)                 # constant first
    elif op == "/":
        if is_number(left, 0):
            return Number(0)
        if is_number(right, 1):
            return left
        if str(left) == str(right):
            return Number(1)
    elif op == "^":
        if is_number(right, 0):
            return Number(1)
        if is_number(right, 1):
            return left
        if is_number(left, 1):
            return Number(1)
    return BinaryOp(op, left, right)


def fold_product(left, right):
    """Collapse c1 * (c2 * u) and its mirror images into (c1*c2) * u."""
    for constant, other in ((left, right), (right, left)):
        if isinstance(constant, Number) and isinstance(other, BinaryOp) \
                and other.op == "*":
            for inner, rest in ((other.left, other.right),
                                (other.right, other.left)):
                if isinstance(inner, Number):
                    return simplify(BinaryOp(
                        "*", Number(constant.value * inner.value), rest))
    return None


ZERO, ONE = Number(0), Number(1)


def derivative_of_call(node, variable):
    """Differentiate a function call by the chain rule."""
    name, args = node.name, node.args
    if name in {"floor", "ceil", "sign", "max", "min", "hypot"}:
        raise ValueError("cannot symbolically differentiate %r" % name)
    if name == "log" and len(args) == 2:
        if variable in args[1].variables():
            raise ValueError("cannot differentiate log with a variable base")
        u = args[0]
        return BinaryOp("*", BinaryOp(
            "/", ONE, BinaryOp("*", u, Call("ln", (args[1],)))),
            differentiate(u, variable))
    if len(args) != 1:
        raise ValueError("cannot differentiate %s/%d" % (name, len(args)))

    u = args[0]
    du = differentiate(u, variable)
    sq = lambda e: BinaryOp("^", e, Number(2))
    if name == "sin":
        outer = Call("cos", (u,))
    elif name == "cos":
        outer = UnaryOp("-", Call("sin", (u,)))
    elif name == "tan":
        outer = BinaryOp("/", ONE, sq(Call("cos", (u,))))
    elif name == "exp":
        outer = Call("exp", (u,))
    elif name in {"ln", "log"}:
        outer = BinaryOp("/", ONE, u)
    elif name in {"log10", "log2"}:
        base = Number(10 if name == "log10" else 2)
        outer = BinaryOp("/", ONE, BinaryOp("*", u, Call("ln", (base,))))
    elif name == "sqrt":
        outer = BinaryOp("/", ONE, BinaryOp("*", Number(2), Call("sqrt", (u,))))
    elif name == "cbrt":
        outer = BinaryOp("/", ONE,
                         BinaryOp("*", Number(3), sq(Call("cbrt", (u,)))))
    elif name == "sinh":
        outer = Call("cosh", (u,))
    elif name == "cosh":
        outer = Call("sinh", (u,))
    elif name == "tanh":
        outer = BinaryOp("-", ONE, sq(Call("tanh", (u,))))
    elif name == "asin":
        outer = BinaryOp("/", ONE,
                         Call("sqrt", (BinaryOp("-", ONE, sq(u)),)))
    elif name == "acos":
        outer = UnaryOp("-", BinaryOp(
            "/", ONE, Call("sqrt", (BinaryOp("-", ONE, sq(u)),))))
    elif name == "atan":
        outer = BinaryOp("/", ONE, BinaryOp("+", ONE, sq(u)))
    elif name == "abs":
        outer = Call("sign", (u,))
    elif name in {"erf", "erfc"}:
        body = BinaryOp("/",
                        BinaryOp("*", Number(2),
                                 Call("exp", (UnaryOp("-", sq(u)),))),
                        Call("sqrt", (Variable("pi"),)))
        outer = body if name == "erf" else UnaryOp("-", body)
    elif name in {"degrees", "radians"}:
        outer = Number(180 / math.pi if name == "degrees" else math.pi / 180)
    else:
        raise ValueError("no derivative rule for %r" % name)
    return BinaryOp("*", outer, du)


def differentiate(source, variable="x", order=1):
    """Symbolic derivative; order=2 gives the second derivative, and so on."""
    if order < 0:
        raise ValueError("order must be non-negative")
    node = parse(source) if isinstance(source, str) else source
    for _ in range(order):
        node = simplify(differentiate_once(simplify(node), variable))
    return node if order else simplify(node)


def differentiate_once(node, variable):
    """One application of the differentiation rules."""
    if isinstance(node, Number):
        return ZERO
    if isinstance(node, Variable):
        return ONE if node.name == variable else ZERO
    if isinstance(node, UnaryOp):
        return UnaryOp("-", differentiate_once(node.operand, variable))
    if isinstance(node, Call):
        return derivative_of_call(node, variable)

    left, right = node.left, node.right
    dl = differentiate_once(left, variable)
    dr = differentiate_once(right, variable)
    if node.op == "+":
        return BinaryOp("+", dl, dr)
    if node.op == "-":
        return BinaryOp("-", dl, dr)
    if node.op == "*":                                        # product rule
        return BinaryOp("+", BinaryOp("*", dl, right),
                        BinaryOp("*", left, dr))
    if node.op == "/":                                        # quotient rule
        return BinaryOp("/",
                        BinaryOp("-", BinaryOp("*", dl, right),
                                 BinaryOp("*", left, dr)),
                        BinaryOp("^", right, Number(2)))
    if node.op == "^":
        constant_exponent = variable not in right.variables()
        constant_base = variable not in left.variables()
        if constant_exponent and constant_base:
            return ZERO
        if constant_exponent:                                 # u^n
            return BinaryOp("*", BinaryOp(
                "*", right, BinaryOp("^", left,
                                     simplify(BinaryOp("-", right, ONE)))), dl)
        if constant_base:                                     # a^v
            return BinaryOp("*", BinaryOp(
                "*", BinaryOp("^", left, right), Call("ln", (left,))), dr)
        inner = BinaryOp("+", BinaryOp("*", dr, Call("ln", (left,))),
                         BinaryOp("/", BinaryOp("*", right, dl), left))
        return BinaryOp("*", BinaryOp("^", left, right), inner)   # u^v
    raise ValueError("cannot differentiate operator %r" % node.op)


# ===========================================================================
# 2. CALCULUS - numerical derivatives, integrals, limits, series, ODEs
# ===========================================================================

def derivative(f, x, h=None, order=4):
    """Numerical first derivative by a central difference."""
    if h is None:
        h = (abs(x) + 1.0) * 1e-5
    if order == 2:
        return (f(x + h) - f(x - h)) / (2 * h)
    if order == 4:
        return (f(x - 2 * h) - 8 * f(x - h) + 8 * f(x + h) - f(x + 2 * h)) / (12 * h)
    raise ValueError("order must be 2 or 4")


def second_derivative(f, x, h=None):
    """Numerical second derivative by a central difference."""
    if h is None:
        h = (abs(x) + 1.0) * 1e-4
    return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h)


def nth_derivative(f, x, n, h=None):
    """Numerical n-th derivative; reliable to about n = 6."""
    if n < 0:
        raise ValueError("n must be non-negative")
    if n == 0:
        return f(x)
    if h is None:
        h = (abs(x) + 1.0) * (1e-16 ** (1.0 / (n + 2)))
    total = sum(math.comb(n, k) * (-1) ** k * f(x + (n / 2.0 - k) * h)
                for k in range(n + 1))
    return total / h ** n


def gradient(f, point, h=1e-6):
    """Gradient of a scalar field f(vector) at a point."""
    result = []
    for i in range(len(point)):
        forward, backward = list(point), list(point)
        forward[i] += h
        backward[i] -= h
        result.append((f(forward) - f(backward)) / (2 * h))
    return result


def hessian(f, point, h=1e-4):
    """Matrix of second partial derivatives of f(vector) at a point."""
    n = len(point)

    def shifted(**deltas):
        copy = list(point)
        for index, delta in deltas.items():
            copy[int(index[1:])] += delta
        return f(copy)

    centre = f(list(point))
    matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        matrix[i][i] = (shifted(**{"_%d" % i: h}) - 2 * centre
                        + shifted(**{"_%d" % i: -h})) / (h * h)
        for j in range(i + 1, n):
            plus, minus = {"_%d" % i: h}, {"_%d" % i: -h}
            value = (shifted(**dict(plus, **{"_%d" % j: h}))
                     - shifted(**dict(plus, **{"_%d" % j: -h}))
                     - shifted(**dict(minus, **{"_%d" % j: h}))
                     + shifted(**dict(minus, **{"_%d" % j: -h}))) / (4 * h * h)
            matrix[i][j] = matrix[j][i] = value
    return matrix


def trapezoid(f, a, b, n=1000):
    """Composite trapezoidal rule."""
    if n <= 0:
        raise ValueError("n must be positive")
    h = (b - a) / n
    return h * (0.5 * (f(a) + f(b)) + sum(f(a + i * h) for i in range(1, n)))


def midpoint(f, a, b, n=1000):
    """Composite midpoint rule - handles endpoint singularities."""
    if n <= 0:
        raise ValueError("n must be positive")
    h = (b - a) / n
    return h * sum(f(a + (i + 0.5) * h) for i in range(n))


def simpson(f, a, b, n=1000):
    """Composite Simpson's rule; n is rounded up to an even number."""
    if n <= 0:
        raise ValueError("n must be positive")
    if n % 2:
        n += 1
    h = (b - a) / n
    total = f(a) + f(b)
    for i in range(1, n):
        total += f(a + i * h) * (4 if i % 2 else 2)
    return total * h / 3


def romberg(f, a, b, max_steps=12, tolerance=1e-12):
    """Richardson extrapolation of the trapezoid rule."""
    table = [[0.5 * (b - a) * (f(a) + f(b))]]
    for step in range(1, max_steps):
        n = 2 ** step
        h = (b - a) / n
        interior = sum(f(a + (2 * k - 1) * h) for k in range(1, n // 2 + 1))
        row = [0.5 * table[step - 1][0] + h * interior]
        for j in range(1, step + 1):
            factor = 4.0 ** j
            row.append((factor * row[j - 1] - table[step - 1][j - 1]) / (factor - 1))
        table.append(row)
        if abs(row[-1] - table[step - 1][-1]) < tolerance * max(1.0, abs(row[-1])):
            return row[-1]
    return table[-1][-1]


def legendre(n, x):
    """Return (P_n(x), P_n'(x)) by the Legendre recurrence."""
    p0, p1 = 1.0, x
    if n == 0:
        return p0, 0.0
    for k in range(2, n + 1):
        p0, p1 = p1, ((2 * k - 1) * x * p1 - (k - 1) * p0) / k
    return p1, n * (x * p1 - p0) / (x * x - 1.0)


GAUSS_CACHE = {}


def gauss_legendre(f, a, b, n=12):
    """Gauss-Legendre quadrature - exact for polynomials of degree 2n-1."""
    if n < 1:
        raise ValueError("n must be at least 1")
    if n not in GAUSS_CACHE:
        nodes, weights = [], []
        for i in range(1, n + 1):
            x = math.cos(math.pi * (i - 0.25) / (n + 0.5))   # Newton on P_n
            for _ in range(100):
                value, slope = legendre(n, x)
                step = value / slope
                x -= step
                if abs(step) < 1e-15:
                    break
            _, slope = legendre(n, x)
            nodes.append(x)
            weights.append(2.0 / ((1 - x * x) * slope * slope))
        GAUSS_CACHE[n] = (nodes, weights)
    nodes, weights = GAUSS_CACHE[n]
    half, centre = 0.5 * (b - a), 0.5 * (b + a)
    return half * sum(w * f(centre + half * x) for x, w in zip(nodes, weights))


def adaptive_simpson(f, a, b, tolerance=1e-10, max_depth=50):
    """Simpson's rule that refines only where the integrand misbehaves."""
    panel = lambda lo, hi, flo, fmid, fhi: (hi - lo) * (flo + 4 * fmid + fhi) / 6

    def recurse(lo, hi, flo, fmid, fhi, whole, tol, depth):
        mid = 0.5 * (lo + hi)
        f_left = f(0.5 * (lo + mid))
        f_right = f(0.5 * (mid + hi))
        left = panel(lo, mid, flo, f_left, fmid)
        right = panel(mid, hi, fmid, f_right, fhi)
        if depth <= 0 or abs(left + right - whole) <= 15 * tol:
            return left + right + (left + right - whole) / 15
        return (recurse(lo, mid, flo, f_left, fmid, left, tol / 2, depth - 1)
                + recurse(mid, hi, fmid, f_right, fhi, right, tol / 2, depth - 1))

    mid = 0.5 * (a + b)
    fa, fmid, fb = f(a), f(mid), f(b)
    return recurse(a, b, fa, fmid, fb, panel(a, b, fa, fmid, fb),
                   tolerance, max_depth)


def improper_integral(f, a, b, n=400):
    """Integrate over a half-infinite or doubly infinite interval."""
    if b < a:
        return -improper_integral(f, b, a, n)
    edge = 1.0 - 1e-12
    if math.isinf(a) and math.isinf(b):          # x = t/(1-t^2)
        def whole(t):
            d = 1.0 - t * t
            return f(t / d) * (1 + t * t) / (d * d)
        return gauss_legendre(whole, -edge, edge, n)
    if math.isinf(b):                            # x = a + t/(1-t)
        return gauss_legendre(
            lambda t: f(a + t / (1 - t)) / (1 - t) ** 2, 0.0, edge, n)
    if math.isinf(a):
        return gauss_legendre(
            lambda t: f(b - t / (1 - t)) / (1 - t) ** 2, 0.0, edge, n)
    return integrate(f, a, b)


def integrate(f, a, b, method="adaptive", **kwargs):
    """Definite integral; infinite limits are routed to improper_integral."""
    if a == b:
        return 0.0
    if not (math.isfinite(a) and math.isfinite(b)):
        return improper_integral(f, a, b, **kwargs)
    if b < a:
        return -integrate(f, b, a, method, **kwargs)
    methods = {"adaptive": adaptive_simpson, "romberg": romberg,
               "simpson": simpson, "trapezoid": trapezoid,
               "midpoint": midpoint, "gauss": gauss_legendre}
    if method not in methods:
        raise ValueError("unknown integration method %r" % method)
    return methods[method](f, a, b, **kwargs)


def double_integral(f, x_range, y_range, n=24):
    """Integrate f(x, y) over a rectangle, or a region with curved y bounds."""
    def inner(x):
        y0, y1 = y_range(x) if callable(y_range) else y_range
        return gauss_legendre(lambda y: f(x, y), y0, y1, n)
    return gauss_legendre(inner, x_range[0], x_range[1], n)


def accelerate(values, tolerance):
    """Aitken's delta-squared process, repeated until the sequence stalls."""
    best, current = values[-1], values
    for _ in range(6):
        if len(current) < 3:
            break
        nxt = []
        for i in range(len(current) - 2):
            a, b, c = current[i], current[i + 1], current[i + 2]
            denominator = c - 2 * b + a
            if abs(denominator) < 1e-300:
                nxt.append(c)
                continue
            candidate = a - (b - a) ** 2 / denominator
            if math.isfinite(candidate):
                nxt.append(candidate)
        if not nxt:
            break
        current, best = nxt, nxt[-1]
        if len(current) >= 2 and abs(current[-1] - current[-2]) < \
                tolerance * max(1.0, abs(current[-1])):
            break
    return best


def is_diverging(values, factor=1.5):
    """Whether the tail keeps growing in magnitude without bound."""
    tail = values[-5:]
    if len(tail) < 5 or abs(tail[-1]) < 1e4:
        return False
    return all(abs(b) > abs(a) * factor and a * b > 0
               for a, b in zip(tail, tail[1:]))


def limit(f, x, side="both", tolerance=1e-9):
    """Estimate a limit by sampling and extrapolating."""
    if side not in {"both", "left", "right"}:
        raise ValueError("side must be 'both', 'left' or 'right'")

    def one_sided(direction):
        # Stop short of machine epsilon: past about h = 1e-6 the samples lose
        # more to cancellation than they gain from closeness.
        h, estimates = 0.1, []
        for _ in range(16):
            try:
                value = f(x + direction * h)
            except (ZeroDivisionError, ValueError, OverflowError):
                h /= 2
                continue
            if not math.isfinite(value):
                break
            estimates.append(value)
            h /= 2
        if not estimates:
            raise ValueError("function undefined near the limit point")
        if is_diverging(estimates):
            return math.copysign(math.inf, estimates[-1])
        return accelerate(estimates, tolerance)

    if side != "both":
        return one_sided(-1 if side == "left" else 1)
    left, right = one_sided(-1), one_sided(1)
    if math.isinf(left) or math.isinf(right):
        if left == right:
            return left
        raise ValueError("limit does not exist: left=%r, right=%r" % (left, right))
    if abs(left - right) > 1e-5 * max(1.0, abs(left), abs(right)):
        raise ValueError("limit does not exist: left=%r, right=%r" % (left, right))
    return 0.5 * (left + right)


def taylor_coefficients(f, centre, order):
    """Return [f(a), f'(a), f''(a)/2!, ...] up to the given order."""
    return [f(centre)] + [nth_derivative(f, centre, n) / math.factorial(n)
                          for n in range(1, order + 1)]


def arc_length(f, a, b, n=2000):
    """Length of the curve y = f(x) over [a, b]."""
    return simpson(lambda x: math.sqrt(1 + derivative(f, x) ** 2), a, b, n)


def surface_of_revolution(f, a, b, n=2000):
    """Area swept by rotating y = f(x) about the x axis."""
    return simpson(lambda x: 2 * math.pi * abs(f(x))
                   * math.sqrt(1 + derivative(f, x) ** 2), a, b, n)


def euler_method(f, y0, t0, t1, steps=1000):
    """Solve y' = f(t, y) by the explicit Euler method."""
    if steps <= 0:
        raise ValueError("steps must be positive")
    h, t, y = (t1 - t0) / steps, t0, y0
    path = [(t, y)]
    for _ in range(steps):
        y += h * f(t, y)
        t += h
        path.append((t, y))
    return path


def runge_kutta4(f, y0, t0, t1, steps=1000):
    """Solve y' = f(t, y) by the classic fourth-order Runge-Kutta method."""
    if steps <= 0:
        raise ValueError("steps must be positive")
    h, t, y = (t1 - t0) / steps, t0, y0
    path = [(t, y)]
    for _ in range(steps):
        k1 = f(t, y)
        k2 = f(t + h / 2, y + h * k1 / 2)
        k3 = f(t + h / 2, y + h * k2 / 2)
        k4 = f(t + h, y + h * k3)
        y += h * (k1 + 2 * k2 + 2 * k3 + k4) / 6
        t += h
        path.append((t, y))
    return path


def solve_ode(f, y0, t0, t1, steps=1000, method="rk4"):
    """Solve an initial value problem with 'rk4' or 'euler'."""
    if method == "rk4":
        return runge_kutta4(f, y0, t0, t1, steps)
    if method == "euler":
        return euler_method(f, y0, t0, t1, steps)
    raise ValueError("unknown ODE method %r" % method)


# ===========================================================================
# 3. ALGEBRA - polynomials, root finding, optimization
# ===========================================================================

class ConvergenceError(RuntimeError):
    """Raised when an iterative method fails to converge."""


class Polynomial:
    """A polynomial with coefficients in ascending power order."""

    def __init__(self, coefficients):
        values = [float(c) for c in coefficients]
        while len(values) > 1 and abs(values[-1]) < 1e-15:
            values.pop()
        self.coefficients = values or [0.0]

    @property
    def degree(self):
        """Degree of the polynomial."""
        return len(self.coefficients) - 1

    def __call__(self, x):
        return self.evaluate(x)

    def evaluate(self, x):
        """Evaluate by Horner's method."""
        total = 0.0
        for c in reversed(self.coefficients):
            total = total * x + c
        return total

    def coefficient(self, power):
        """Coefficient of x**power, or 0 beyond the degree."""
        return self.coefficients[power] if 0 <= power < len(self.coefficients) else 0.0

    def __eq__(self, other):
        return isinstance(other, Polynomial) and self.degree == other.degree and \
            all(math.isclose(a, b, abs_tol=1e-12)
                for a, b in zip(self.coefficients, other.coefficients))

    def __repr__(self):
        return "Polynomial(%r)" % self.coefficients

    def __str__(self):
        terms = []
        for power, c in reversed(list(enumerate(self.coefficients))):
            if abs(c) < 1e-15 and self.degree > 0:
                continue
            magnitude = abs(c)
            body = "" if (magnitude == 1 and power) else "%.10g" % magnitude
            body += "x" if power == 1 else ("x^%d" % power if power > 1 else "")
            if terms:
                terms.append("%s %s" % ("-" if c < 0 else "+", body))
            else:
                terms.append("-" + body if c < 0 else body)
        return " ".join(terms) if terms else "0"

    def __add__(self, other):
        other = other if isinstance(other, Polynomial) else Polynomial([other])
        length = max(len(self.coefficients), len(other.coefficients))
        return Polynomial([self.coefficient(i) + other.coefficient(i)
                           for i in range(length)])

    __radd__ = __add__

    def __neg__(self):
        return Polynomial([-c for c in self.coefficients])

    def __sub__(self, other):
        other = other if isinstance(other, Polynomial) else Polynomial([other])
        return self + (-other)

    def __mul__(self, other):
        if not isinstance(other, Polynomial):
            return Polynomial([c * other for c in self.coefficients])
        result = [0.0] * (self.degree + other.degree + 1)
        for i, a in enumerate(self.coefficients):
            for j, b in enumerate(other.coefficients):
                result[i + j] += a * b
        return Polynomial(result)

    __rmul__ = __mul__

    def __pow__(self, exponent):
        if exponent < 0 or int(exponent) != exponent:
            raise ValueError("exponent must be a non-negative integer")
        result, base, exponent = Polynomial([1.0]), self, int(exponent)
        while exponent:
            if exponent & 1:
                result = result * base
            base = base * base
            exponent >>= 1
        return result

    def divide(self, divisor):
        """Long division, returning (quotient, remainder)."""
        if divisor.degree == 0 and divisor.coefficients[0] == 0:
            raise ZeroDivisionError("division by the zero polynomial")
        remainder = self.coefficients[:]
        quotient = [0.0] * max(1, self.degree - divisor.degree + 1)
        lead = divisor.coefficients[-1]
        for power in range(self.degree - divisor.degree, -1, -1):
            factor = remainder[power + divisor.degree] / lead
            quotient[power] = factor
            if factor:
                for i, c in enumerate(divisor.coefficients):
                    remainder[power + i] -= factor * c
        return Polynomial(quotient), Polynomial(remainder[:divisor.degree] or [0.0])

    __divmod__ = divide

    def derivative(self, order=1):
        """The exact derivative."""
        result = self
        for _ in range(order):
            result = Polynomial(
                [p * c for p, c in enumerate(result.coefficients)][1:] or [0.0])
        return result

    def antiderivative(self, constant=0.0):
        """An antiderivative with the given integration constant."""
        return Polynomial([constant] + [c / (p + 1) for p, c
                                        in enumerate(self.coefficients)])

    def integrate(self, a, b):
        """Exact definite integral over [a, b]."""
        F = self.antiderivative()
        return F(b) - F(a)

    def compose(self, other):
        """Composition self(other(x))."""
        result = Polynomial([0.0])
        for c in reversed(self.coefficients):
            result = result * other + Polynomial([c])
        return result

    def gcd(self, other, tolerance=1e-9):
        """Monic greatest common divisor by the Euclidean algorithm."""
        a, b = self, other
        while b.degree > 0 or abs(b.coefficients[0]) > tolerance:
            _, remainder = a.divide(b)
            remainder = Polynomial([0.0 if abs(c) < tolerance else c
                                    for c in remainder.coefficients])
            a, b = b, remainder
        return Polynomial([c / a.coefficients[-1] for c in a.coefficients])

    def roots(self, tolerance=1e-12, iterations=500):
        """All complex roots, by the Durand-Kerner method."""
        degree = self.degree
        if degree < 1:
            return []
        if degree == 1:
            return [complex(-self.coefficients[0] / self.coefficients[1], 0)]
        if degree == 2:
            return list(quadratic_roots(*reversed(self.coefficients)))

        monic = [c / self.coefficients[-1] for c in self.coefficients]

        def value_at(z):
            total = 0j
            for c in reversed(monic):
                total = total * z + c
            return total

        approximations = [complex(0.4, 0.9) ** k for k in range(degree)]
        for _ in range(iterations):
            shift = 0.0
            for i in range(degree):
                denominator = 1 + 0j
                for j in range(degree):
                    if i != j:
                        denominator *= approximations[i] - approximations[j]
                if denominator == 0:
                    continue
                delta = value_at(approximations[i]) / denominator
                approximations[i] -= delta
                shift = max(shift, abs(delta))
            if shift < tolerance:
                break
        cleaned = [complex(r.real, 0.0) if abs(r.imag) < 1e-8 else r
                   for r in approximations]
        return sorted(cleaned, key=lambda z: (round(z.real, 9), round(z.imag, 9)))

    def real_roots(self, tolerance=1e-8):
        """Only the real roots, sorted ascending."""
        return sorted(r.real for r in self.roots() if abs(r.imag) < tolerance)

    @classmethod
    def from_roots(cls, roots):
        """The monic polynomial with the given roots."""
        result = cls([1.0])
        for root in roots:
            result = result * cls([-root, 1.0])
        return result

    @classmethod
    def interpolate(cls, points):
        """The Lagrange interpolating polynomial through the given points."""
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


def quadratic_roots(a, b, c):
    """Roots of ax^2 + bx + c, by a numerically stable formula."""
    if a == 0:
        if b == 0:
            raise ValueError("not an equation in x")
        return complex(-c / b, 0), complex(-c / b, 0)
    root = cmath.sqrt(complex(b * b - 4 * a * c, 0))
    # Pick the sign that adds, so the terms never cancel catastrophically.
    q = -0.5 * (b + root if b >= 0 else b - root)
    if q == 0:
        return complex(0, 0), complex(0, 0)
    return q / a, complex(c, 0) / q


def cubic_roots(a, b, c, d):
    """Roots of ax^3 + bx^2 + cx + d, by Cardano's formula."""
    if a == 0:
        return list(quadratic_roots(b, c, d))
    b, c, d = b / a, c / a, d / a
    p = c - b * b / 3                        # depressed cubic t^3 + pt + q
    q = 2 * b ** 3 / 27 - b * c / 3 + d
    offset = -b / 3
    if abs(p) < 1e-14 and abs(q) < 1e-14:
        return [complex(offset, 0)] * 3
    discriminant = (q / 2) ** 2 + (p / 3) ** 3
    roots = []
    for k in range(3):
        u = (-q / 2 + cmath.sqrt(complex(discriminant, 0))) ** (1 / 3)
        u *= cmath.exp(2j * math.pi * k / 3)
        root = complex(offset, 0) if abs(u) < 1e-14 else u - p / (3 * u) + offset
        roots.append(complex(root.real, 0.0) if abs(root.imag) < 1e-9 else root)
    return sorted(roots, key=lambda z: (round(z.real, 9), round(z.imag, 9)))


def bisection(f, a, b, tolerance=1e-12, iterations=200):
    """Find a root in the bracketing interval [a, b]."""
    fa, fb = f(a), f(b)
    if fa == 0:
        return a
    if fb == 0:
        return b
    if fa * fb > 0:
        raise ValueError("f(a) and f(b) must have opposite signs")
    for _ in range(iterations):
        mid = 0.5 * (a + b)
        fmid = f(mid)
        if fmid == 0 or (b - a) / 2 < tolerance:
            return mid
        if fa * fmid < 0:
            b = mid
        else:
            a, fa = mid, fmid
    return 0.5 * (a + b)


def newton(f, x0, df=None, tolerance=1e-12, iterations=100):
    """Newton-Raphson root finding; the derivative is estimated if omitted."""
    x = float(x0)
    for _ in range(iterations):
        value = f(x)
        if abs(value) < tolerance:
            return x
        if df is not None:
            slope = df(x)
        else:
            h = (abs(x) + 1.0) * 1e-7
            slope = (f(x + h) - f(x - h)) / (2 * h)
        if abs(slope) < 1e-14:
            raise ConvergenceError("derivative vanished near x = %g" % x)
        step = value / slope
        x -= step
        if abs(step) < tolerance * max(1.0, abs(x)):
            return x
    raise ConvergenceError("Newton's method did not converge from %g" % x0)


def secant(f, x0, x1, tolerance=1e-12, iterations=200):
    """The secant method: Newton without a derivative."""
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


def brent(f, a, b, tolerance=1e-14, iterations=200):
    """Brent's method: bisection's safety with faster interpolation steps."""
    fa, fb = f(a), f(b)
    if fa * fb > 0:
        raise ValueError("f(a) and f(b) must have opposite signs")
    if abs(fa) < abs(fb):
        a, b, fa, fb = b, a, fb, fa
    c, fc, used_bisection, d = a, fa, True, b - a
    for _ in range(iterations):
        if fb == 0 or abs(b - a) < tolerance:
            return b
        if fa != fc and fb != fc:                    # inverse quadratic
            s = (a * fb * fc / ((fa - fb) * (fa - fc))
                 + b * fa * fc / ((fb - fa) * (fb - fc))
                 + c * fa * fb / ((fc - fa) * (fc - fb)))
        else:
            s = b - fb * (b - a) / (fb - fa)
        lower, upper = sorted(((3 * a + b) / 4, b))
        if (not lower < s < upper
                or (used_bisection and abs(s - b) >= abs(b - c) / 2)
                or (not used_bisection and abs(s - b) >= abs(c - d) / 2)):
            s, used_bisection = 0.5 * (a + b), True
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


def find_all_roots(f, a, b, samples=1000, tolerance=1e-9):
    """Scan [a, b] for sign changes and refine each bracket into a root."""
    roots, step, previous_x = [], (b - a) / samples, a
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
    unique = []
    for root in sorted(roots):
        if not unique or abs(root - unique[-1]) > tolerance:
            unique.append(root)
    return unique


def minimize(f, a, b, tolerance=1e-10):
    """Minimize a unimodal f on [a, b] by golden-section search."""
    phi = (math.sqrt(5) - 1) / 2
    c, d = b - phi * (b - a), a + phi * (b - a)
    fc, fd = f(c), f(d)
    while abs(b - a) > tolerance:
        if fc < fd:
            b, d, fd = d, c, fc
            c = b - phi * (b - a)
            fc = f(c)
        else:
            a, c, fc = c, d, fd
            d = a + phi * (b - a)
            fd = f(d)
    x = 0.5 * (a + b)
    return x, f(x)


# ===========================================================================
# 4. LINEAR ALGEBRA - vectors and matrices
# ===========================================================================

class SingularMatrixError(ValueError):
    """Raised when a matrix has no inverse or a system has no unique solution."""


def dot(a, b):
    """Dot product of two vectors of equal length."""
    if len(a) != len(b):
        raise ValueError("vectors must have the same length")
    return float(sum(x * y for x, y in zip(a, b)))


def cross(a, b):
    """Cross product of two three-dimensional vectors."""
    if len(a) != 3 or len(b) != 3:
        raise ValueError("cross product needs three-dimensional vectors")
    return [a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]]


def norm(a, p=2.0):
    """The p-norm of a vector; p=inf gives the maximum norm."""
    if math.isinf(p):
        return max((abs(x) for x in a), default=0.0)
    return float(sum(abs(x) ** p for x in a) ** (1.0 / p))


def normalize(a):
    """The unit vector in the same direction as a."""
    length = norm(a)
    if length == 0:
        raise ValueError("cannot normalize the zero vector")
    return [x / length for x in a]


def angle_between(a, b, degrees=False):
    """Angle between two vectors, in radians unless degrees is set."""
    denominator = norm(a) * norm(b)
    if denominator == 0:
        raise ValueError("angle undefined for the zero vector")
    angle = math.acos(max(-1.0, min(1.0, dot(a, b) / denominator)))
    return math.degrees(angle) if degrees else angle


class Matrix:
    """A dense matrix of floats, stored as a list of rows."""

    def __init__(self, rows):
        data = [[float(v) for v in row] for row in rows]
        if not data or not data[0]:
            raise ValueError("matrix needs at least one row and column")
        if any(len(row) != len(data[0]) for row in data):
            raise ValueError("all rows must have the same length")
        self.rows = data
        self.shape = (len(data), len(data[0]))

    @classmethod
    def identity(cls, n):
        """The n by n identity matrix."""
        return cls([[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)])

    @classmethod
    def zeros(cls, rows, columns):
        """A matrix of zeros."""
        return cls([[0.0] * columns for _ in range(rows)])

    @classmethod
    def from_columns(cls, columns):
        """Build a matrix whose columns are the given vectors."""
        return cls(list(zip(*columns)))

    def __getitem__(self, index):
        return self.rows[index]

    def __len__(self):
        return self.shape[0]

    def __iter__(self):
        return iter(self.rows)

    def __eq__(self, other):
        return isinstance(other, Matrix) and self.shape == other.shape and all(
            math.isclose(a, b, abs_tol=1e-12)
            for ra, rb in zip(self.rows, other.rows) for a, b in zip(ra, rb))

    def __repr__(self):
        return "Matrix(%r)" % self.rows

    def __str__(self):
        cells = [["%g" % v for v in row] for row in self.rows]
        widths = [max(len(row[j]) for row in cells) for j in range(self.shape[1])]
        return "\n".join(
            "[ " + "  ".join(c.rjust(w) for c, w in zip(row, widths)) + " ]"
            for row in cells)

    def __add__(self, other):
        if self.shape != other.shape:
            raise ValueError("shapes do not match for addition")
        return Matrix([[a + b for a, b in zip(ra, rb)]
                       for ra, rb in zip(self.rows, other.rows)])

    def __sub__(self, other):
        if self.shape != other.shape:
            raise ValueError("shapes do not match for subtraction")
        return Matrix([[a - b for a, b in zip(ra, rb)]
                       for ra, rb in zip(self.rows, other.rows)])

    def __mul__(self, scalar):
        return Matrix([[v * scalar for v in row] for row in self.rows])

    __rmul__ = __mul__

    def __neg__(self):
        return self * -1.0

    def multiply(self, other):
        """Matrix product self @ other."""
        if self.shape[1] != other.shape[0]:
            raise ValueError("cannot multiply %s by %s" % (self.shape, other.shape))
        columns = other.transpose().rows
        return Matrix([[dot(row, column) for column in columns]
                       for row in self.rows])

    __matmul__ = multiply

    def apply(self, vector):
        """Multiply this matrix by a column vector."""
        if len(vector) != self.shape[1]:
            raise ValueError("vector length must match the number of columns")
        return [dot(row, vector) for row in self.rows]

    def power(self, exponent):
        """Raise a square matrix to an integer power."""
        n, m = self.shape
        if n != m:
            raise ValueError("matrix power requires a square matrix")
        if exponent < 0:
            return self.inverse().power(-exponent)
        result, base = Matrix.identity(n), self
        while exponent:
            if exponent & 1:
                result = result.multiply(base)
            base = base.multiply(base)
            exponent >>= 1
        return result

    def transpose(self):
        """The transpose of this matrix."""
        return Matrix([list(column) for column in zip(*self.rows)])

    def trace(self):
        """Sum of the diagonal entries."""
        n, m = self.shape
        if n != m:
            raise ValueError("trace requires a square matrix")
        return float(sum(self.rows[i][i] for i in range(n)))

    def is_symmetric(self, tolerance=1e-10):
        """Whether the matrix equals its own transpose."""
        n, m = self.shape
        return n == m and all(abs(self.rows[i][j] - self.rows[j][i]) <= tolerance
                              for i in range(n) for j in range(i + 1, n))

    def lu_decomposition(self):
        """LU decomposition with partial pivoting: (L, U, permutation, sign)."""
        n, m = self.shape
        if n != m:
            raise ValueError("LU decomposition requires a square matrix")
        u = [row[:] for row in self.rows]
        l = [[0.0] * n for _ in range(n)]
        permutation, sign = list(range(n)), 1
        for k in range(n):
            pivot = max(range(k, n), key=lambda i: abs(u[i][k]))
            if abs(u[pivot][k]) < 1e-14:
                raise SingularMatrixError("matrix is singular to working precision")
            if pivot != k:
                u[k], u[pivot] = u[pivot], u[k]
                l[k], l[pivot] = l[pivot], l[k]
                permutation[k], permutation[pivot] = permutation[pivot], permutation[k]
                sign = -sign
            l[k][k] = 1.0
            for i in range(k + 1, n):
                factor = u[i][k] / u[k][k]
                l[i][k] = factor
                for j in range(k, n):
                    u[i][j] -= factor * u[k][j]
        return Matrix(l), Matrix(u), permutation, sign

    def determinant(self):
        """Determinant, via LU decomposition."""
        n, m = self.shape
        if n != m:
            raise ValueError("determinant requires a square matrix")
        if n == 1:
            return self.rows[0][0]
        if n == 2:
            return self.rows[0][0] * self.rows[1][1] - self.rows[0][1] * self.rows[1][0]
        try:
            _, u, _, sign = self.lu_decomposition()
        except SingularMatrixError:
            return 0.0
        product = float(sign)
        for i in range(n):
            product *= u.rows[i][i]
        return product

    def solve(self, b):
        """Solve self @ x = b by Gaussian elimination with partial pivoting."""
        n, m = self.shape
        if n != m:
            raise ValueError("solve requires a square matrix; use least_squares")
        if len(b) != n:
            raise ValueError("right-hand side length must match the matrix size")
        rows = [row[:] + [float(b[i])] for i, row in enumerate(self.rows)]
        for k in range(n):
            pivot = max(range(k, n), key=lambda i: abs(rows[i][k]))
            if abs(rows[pivot][k]) < 1e-14:
                raise SingularMatrixError("system has no unique solution")
            rows[k], rows[pivot] = rows[pivot], rows[k]
            for i in range(k + 1, n):
                factor = rows[i][k] / rows[k][k]
                if factor:
                    for j in range(k, n + 1):
                        rows[i][j] -= factor * rows[k][j]
        x = [0.0] * n
        for i in range(n - 1, -1, -1):
            total = rows[i][n] - sum(rows[i][j] * x[j] for j in range(i + 1, n))
            x[i] = total / rows[i][i]
        return x

    def inverse(self):
        """The inverse of a square matrix."""
        n, m = self.shape
        if n != m:
            raise ValueError("inverse requires a square matrix")
        return Matrix.from_columns(
            [self.solve([1.0 if i == j else 0.0 for i in range(n)])
             for j in range(n)])

    def rank(self, tolerance=1e-10):
        """Rank, by Gaussian elimination to row echelon form."""
        rows = [row[:] for row in self.rows]
        n, m = self.shape
        rank = pivot_row = 0
        for column in range(m):
            if pivot_row >= n:
                break
            best = max(range(pivot_row, n), key=lambda i: abs(rows[i][column]))
            if abs(rows[best][column]) <= tolerance:
                continue
            rows[pivot_row], rows[best] = rows[best], rows[pivot_row]
            for i in range(pivot_row + 1, n):
                factor = rows[i][column] / rows[pivot_row][column]
                for j in range(column, m):
                    rows[i][j] -= factor * rows[pivot_row][j]
            pivot_row += 1
            rank += 1
        return rank

    def row_echelon(self, reduced=True, tolerance=1e-12):
        """Row echelon form; reduced gives the RREF."""
        rows = [row[:] for row in self.rows]
        n, m = self.shape
        pivot_row = 0
        for column in range(m):
            if pivot_row >= n:
                break
            best = max(range(pivot_row, n), key=lambda i: abs(rows[i][column]))
            if abs(rows[best][column]) <= tolerance:
                continue
            rows[pivot_row], rows[best] = rows[best], rows[pivot_row]
            pivot = rows[pivot_row][column]
            rows[pivot_row] = [v / pivot for v in rows[pivot_row]]
            for i in (range(n) if reduced else range(pivot_row + 1, n)):
                if i != pivot_row and rows[i][column]:
                    factor = rows[i][column]
                    for j in range(m):
                        rows[i][j] -= factor * rows[pivot_row][j]
            pivot_row += 1
        return Matrix([[0.0 if v == 0 else v for v in row] for row in rows])

    def qr_decomposition(self):
        """QR decomposition by the modified Gram-Schmidt process."""
        n, m = self.shape
        columns = [list(c) for c in zip(*self.rows)]
        q_columns, r = [], [[0.0] * m for _ in range(m)]
        for j in range(m):
            v = columns[j][:]
            for i, q in enumerate(q_columns):
                r[i][j] = dot(q, v)
                for k in range(n):
                    v[k] -= r[i][j] * q[k]
            length = norm(v)
            r[j][j] = length
            q_columns.append([x / length for x in v] if length > 1e-14 else [0.0] * n)
        return Matrix.from_columns(q_columns), Matrix(r)

    def eigenvalues(self, iterations=500, tolerance=1e-12):
        """Real eigenvalues by the QR algorithm (real spectra only)."""
        n, m = self.shape
        if n != m:
            raise ValueError("eigenvalues require a square matrix")
        a = Matrix([row[:] for row in self.rows])
        for _ in range(iterations):
            q, r = a.qr_decomposition()
            a = r.multiply(q)
            if sum(abs(a.rows[i][j]) for i in range(n)
                   for j in range(i)) < tolerance:
                break
        return sorted((a.rows[i][i] for i in range(n)), reverse=True)

    def eigenvector(self, eigenvalue, iterations=100):
        """Eigenvector for the given eigenvalue, by inverse iteration."""
        n = self.shape[0]
        shifted = Matrix([[v - (eigenvalue + 1e-8 if i == j else 0.0)
                           for j, v in enumerate(row)]
                          for i, row in enumerate(self.rows)])
        v = [1.0 / math.sqrt(n)] * n
        for _ in range(iterations):
            try:
                w = shifted.solve(v)
            except SingularMatrixError:
                break
            length = norm(w)
            if length == 0:
                break
            new = [x / length for x in w]
            if norm([a - b for a, b in zip(new, v)]) < 1e-12:
                v = new
                break
            v = new
        pivot = max(v, key=abs)
        return [x if pivot >= 0 else -x for x in v]

    def least_squares(self, b):
        """Least-squares solution of an overdetermined system."""
        at = self.transpose()
        return at.multiply(self).solve(at.apply(b))


# ===========================================================================
# 5. NUMBER THEORY - primes, factorization, modular arithmetic, sequences
# ===========================================================================

SMALL_PRIMES = (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37)


def gcd(*values):
    """Greatest common divisor of any number of integers."""
    return math.gcd(*(abs(int(v)) for v in values))


def lcm(*values):
    """Least common multiple of any number of integers."""
    return math.lcm(*(abs(int(v)) for v in values))


def extended_gcd(a, b):
    """Return (g, x, y) with a*x + b*y == g == gcd(a, b)."""
    old_r, r = int(a), int(b)
    old_s, s, old_t, t = 1, 0, 0, 1
    while r:
        q = old_r // r
        old_r, r = r, old_r - q * r
        old_s, s = s, old_s - q * s
        old_t, t = t, old_t - q * t
    if old_r < 0:
        old_r, old_s, old_t = -old_r, -old_s, -old_t
    return old_r, old_s, old_t


def is_prime(n):
    """Deterministic Miller-Rabin primality test (exact for 64-bit inputs)."""
    n = int(n)
    if n < 2:
        return False
    for p in SMALL_PRIMES:
        if n % p == 0:
            return n == p
    d, exponent = n - 1, 0
    while d % 2 == 0:
        d //= 2
        exponent += 1
    for witness in SMALL_PRIMES:
        x = pow(witness, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(exponent - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True


def primes_up_to(limit):
    """All primes up to the limit, by the sieve of Eratosthenes."""
    limit = int(limit)
    if limit < 2:
        return []
    sieve = bytearray([1]) * (limit + 1)
    sieve[0] = sieve[1] = 0
    for n in range(2, int(limit ** 0.5) + 1):
        if sieve[n]:
            sieve[n * n::n] = bytearray(len(sieve[n * n::n]))
    return [n for n in range(limit + 1) if sieve[n]]


def pollard_rho(n):
    """Find a non-trivial factor of a composite n."""
    if n % 2 == 0:
        return 2
    while True:
        x = y = random.randrange(2, n)
        c, d = random.randrange(1, n), 1
        while d == 1:
            x = (x * x + c) % n
            y = (y * y + c) % n
            y = (y * y + c) % n
            d = math.gcd(abs(x - y), n)
        if d != n:
            return d


def prime_factors(n):
    """Prime factors with multiplicity, sorted ascending."""
    n = int(n)
    if n == 0:
        raise ValueError("0 has no prime factorization")
    factors = []
    if n < 0:
        factors.append(-1)
        n = -n
    for p in SMALL_PRIMES:
        while n % p == 0:
            factors.append(p)
            n //= p
    stack = [n] if n > 1 else []
    while stack:
        value = stack.pop()
        if value == 1:
            continue
        if is_prime(value):
            factors.append(value)
            continue
        divisor = pollard_rho(value)
        stack.extend((divisor, value // divisor))
    return sorted(factors)


def factorize(n):
    """Prime factorization as a {prime: exponent} mapping."""
    result = {}
    for factor in prime_factors(n):
        result[factor] = result.get(factor, 0) + 1
    return result


def divisors(n):
    """All positive divisors, sorted ascending."""
    n = abs(int(n))
    if n == 0:
        raise ValueError("every integer divides 0")
    result = [1]
    for prime, exponent in factorize(n).items():
        result = [d * prime ** e for d in result for e in range(exponent + 1)]
    return sorted(result)


def divisor_sum(n, power=1):
    """Sigma function: the sum of each divisor raised to the given power."""
    return sum(d ** power for d in divisors(n))


def totient(n):
    """Euler's totient: how many integers in [1, n] are coprime to n."""
    n = int(n)
    if n < 1:
        raise ValueError("totient is defined for positive integers")
    result = n
    for prime in (factorize(n) if n > 1 else {}):
        result -= result // prime
    return result


def mobius(n):
    """The Moebius function: 0 if n has a squared factor, else (-1)^k."""
    n = int(n)
    if n < 1:
        raise ValueError("mobius is defined for positive integers")
    if n == 1:
        return 1
    exponents = factorize(n)
    if any(e > 1 for e in exponents.values()):
        return 0
    return -1 if len(exponents) % 2 else 1


def next_prime(n):
    """The smallest prime strictly greater than n."""
    candidate = max(int(n), 1) + 1
    while not is_prime(candidate):
        candidate += 1
    return candidate


def previous_prime(n):
    """The largest prime strictly less than n."""
    candidate = int(n) - 1
    if candidate < 2:
        raise ValueError("no prime below 2")
    while not is_prime(candidate):
        candidate -= 1
    return candidate


def nth_prime(n):
    """The n-th prime, counting from 1."""
    if n < 1:
        raise ValueError("n must be at least 1")
    if n < 6:
        return [2, 3, 5, 7, 11][n - 1]
    limit = int(n * (math.log(n) + math.log(math.log(n)))) + 10
    return primes_up_to(limit)[n - 1]


def modular_inverse(a, modulus):
    """The inverse of a modulo the given modulus, if it exists."""
    g, x, _ = extended_gcd(int(a) % int(modulus), int(modulus))
    if g != 1:
        raise ValueError("%s is not invertible modulo %s" % (a, modulus))
    return x % modulus


def modular_power(base, exponent, modulus):
    """Fast modular exponentiation, allowing a negative exponent."""
    if exponent < 0:
        return pow(modular_inverse(base, modulus), -exponent, modulus)
    return pow(int(base), int(exponent), int(modulus))


def chinese_remainder(remainders, moduli):
    """Solve a system of congruences: (solution, combined modulus)."""
    if len(remainders) != len(moduli) or not moduli:
        raise ValueError("need matching, non-empty remainders and moduli")
    solution, modulus = int(remainders[0]) % int(moduli[0]), int(moduli[0])
    for remainder, m in zip(remainders[1:], moduli[1:]):
        remainder, m = int(remainder), int(m)
        g, p, _ = extended_gcd(modulus, m)
        difference = remainder - solution
        if difference % g:
            raise ValueError("the congruences are inconsistent")
        combined = modulus // g * m
        solution = (solution + modulus * ((difference // g) * p % (m // g))) % combined
        modulus = combined
    return solution, modulus


def continued_fraction(value, terms=12):
    """The continued fraction expansion [a0; a1, a2, ...]."""
    result, remainder = [], float(value)
    for _ in range(terms):
        whole = math.floor(remainder)
        result.append(int(whole))
        fractional = remainder - whole
        if fractional < 1e-12:
            break
        remainder = 1.0 / fractional
    return result


def from_continued_fraction(terms):
    """Rebuild the exact rational value of a continued fraction."""
    value = Fraction(terms[-1])
    for term in reversed(terms[:-1]):
        value = term + 1 / value
    return value


def fibonacci(n):
    """The n-th Fibonacci number, by fast doubling."""
    if n < 0:
        value = fibonacci(-n)
        return value if (-n) % 2 else -value

    def doubling(k):
        if k == 0:
            return 0, 1
        a, b = doubling(k >> 1)
        c, d = a * (2 * b - a), a * a + b * b
        return (d, c + d) if k & 1 else (c, d)

    return doubling(int(n))[0]


def fibonacci_sequence(count):
    """The first count Fibonacci numbers, starting at F(0) = 0."""
    result, a, b = [], 0, 1
    for _ in range(count):
        result.append(a)
        a, b = b, a + b
    return result


def catalan(n):
    """The n-th Catalan number."""
    if n < 0:
        raise ValueError("n must be non-negative")
    return math.comb(2 * n, n) // (n + 1)


def collatz(n):
    """The Collatz (3n+1) trajectory from n down to 1."""
    n = int(n)
    if n < 1:
        raise ValueError("n must be a positive integer")
    sequence = [n]
    while n != 1:
        n = n // 2 if n % 2 == 0 else 3 * n + 1
        sequence.append(n)
    return sequence


def harmonic_number(n):
    """The exact harmonic number H(n) = 1 + 1/2 + ... + 1/n."""
    if n < 1:
        raise ValueError("n must be a positive integer")
    return sum((Fraction(1, k) for k in range(1, n + 1)), Fraction(0))


def bernoulli(n):
    """The n-th Bernoulli number, by the Akiyama-Tanigawa algorithm."""
    if n < 0:
        raise ValueError("n must be non-negative")
    row = [Fraction(0)] * (n + 1)
    for j in range(n + 1):
        row[j] = Fraction(1, j + 1)
        for m in range(j, 0, -1):
            row[m - 1] = m * (row[m - 1] - row[m])
    return row[0]


def is_perfect(n):
    """Whether n equals the sum of its proper divisors."""
    n = int(n)
    return n > 1 and divisor_sum(n) - n == n


def digits_of(n, base=10):
    """The digits of n in the given base, most significant first."""
    n = abs(int(n))
    if base < 2:
        raise ValueError("base must be at least 2")
    if n == 0:
        return [0]
    result = []
    while n:
        result.append(n % base)
        n //= base
    return result[::-1]


def digit_sum(n, base=10):
    """Sum of the digits of n in the given base."""
    return sum(digits_of(n, base))


def to_base(n, base):
    """Render n in a base from 2 to 36, using digits and letters."""
    if not 2 <= base <= 36:
        raise ValueError("base must be between 2 and 36")
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
    return ("-" if n < 0 else "") + "".join(alphabet[d] for d in digits_of(n, base))


# ===========================================================================
# 6. STATISTICS - descriptive statistics, regression, distributions
# ===========================================================================

def require(data, minimum=1):
    """Coerce a sample to floats, checking it is long enough."""
    values = [float(x) for x in data]
    if len(values) < minimum:
        raise ValueError("at least %d data point(s) required" % minimum)
    return values


def mean(data):
    """Arithmetic mean."""
    values = require(data)
    return math.fsum(values) / len(values)


def geometric_mean(data):
    """Geometric mean; every value must be positive."""
    values = require(data)
    if any(x <= 0 for x in values):
        raise ValueError("geometric mean requires positive values")
    return math.exp(math.fsum(math.log(x) for x in values) / len(values))


def harmonic_mean(data):
    """Harmonic mean; every value must be non-zero."""
    values = require(data)
    if any(x == 0 for x in values):
        raise ValueError("harmonic mean requires non-zero values")
    return len(values) / math.fsum(1.0 / x for x in values)


def median(data):
    """Middle value, averaging the two central values for even samples."""
    values = sorted(require(data))
    n = len(values)
    return values[n // 2] if n % 2 else 0.5 * (values[n // 2 - 1] + values[n // 2])


def mode(data):
    """All values tied for the highest frequency."""
    values = require(data)
    counts = {}
    for value in values:
        counts[value] = counts.get(value, 0) + 1
    highest = max(counts.values())
    return sorted(v for v, c in counts.items() if c == highest)


def variance(data, sample=True):
    """Variance; sample=True uses the n-1 (Bessel-corrected) denominator."""
    values = require(data, 2 if sample else 1)
    mu = mean(values)
    return math.fsum((x - mu) ** 2 for x in values) / \
        (len(values) - 1 if sample else len(values))


def standard_deviation(data, sample=True):
    """Square root of the variance."""
    return math.sqrt(variance(data, sample))


def quantile(data, q):
    """The q-quantile (0 <= q <= 1), by linear interpolation."""
    if not 0.0 <= q <= 1.0:
        raise ValueError("q must be between 0 and 1")
    values = sorted(require(data))
    if len(values) == 1:
        return values[0]
    position = q * (len(values) - 1)
    lower, upper = math.floor(position), math.ceil(position)
    if lower == upper:
        return values[int(position)]
    weight = position - lower
    return values[lower] * (1 - weight) + values[upper] * weight


def quartiles(data):
    """The first, second (median) and third quartiles."""
    return quantile(data, 0.25), quantile(data, 0.5), quantile(data, 0.75)


def skewness(data):
    """Population skewness, the third standardized moment."""
    values = require(data, 2)
    mu, sigma = mean(values), standard_deviation(values, sample=False)
    if sigma == 0:
        raise ValueError("skewness is undefined for constant data")
    return math.fsum((x - mu) ** 3 for x in values) / (len(values) * sigma ** 3)


def kurtosis(data, excess=True):
    """Kurtosis; excess subtracts 3 so a normal sample scores about 0."""
    values = require(data, 2)
    mu, sigma = mean(values), standard_deviation(values, sample=False)
    if sigma == 0:
        raise ValueError("kurtosis is undefined for constant data")
    value = math.fsum((x - mu) ** 4 for x in values) / (len(values) * sigma ** 4)
    return value - 3.0 if excess else value


def z_scores(data):
    """Standardize a sample to zero mean and unit standard deviation."""
    values = require(data, 2)
    mu, sigma = mean(values), standard_deviation(values)
    if sigma == 0:
        raise ValueError("cannot standardize constant data")
    return [(x - mu) / sigma for x in values]


def covariance(xs, ys, sample=True):
    """Covariance of two paired samples."""
    x, y = require(xs, 2), require(ys, 2)
    if len(x) != len(y):
        raise ValueError("both samples must have the same length")
    mx, my = mean(x), mean(y)
    return math.fsum((a - mx) * (b - my) for a, b in zip(x, y)) / \
        (len(x) - 1 if sample else len(x))


def correlation(xs, ys):
    """Pearson's correlation coefficient, in [-1, 1]."""
    sx, sy = standard_deviation(xs), standard_deviation(ys)
    if sx == 0 or sy == 0:
        raise ValueError("correlation is undefined for constant data")
    return covariance(xs, ys) / (sx * sy)


class LinearFit:
    """The result of a least-squares straight-line fit."""

    def __init__(self, slope, intercept, r_squared):
        self.slope, self.intercept, self.r_squared = slope, intercept, r_squared

    def predict(self, x):
        """Value of the fitted line at x."""
        return self.slope * x + self.intercept

    def __str__(self):
        return "y = %gx %s %g  (R^2 = %.6f)" % (
            self.slope, "+" if self.intercept >= 0 else "-",
            abs(self.intercept), self.r_squared)


def linear_regression(xs, ys):
    """Least-squares fit of y = slope * x + intercept."""
    x, y = require(xs, 2), require(ys, 2)
    if len(x) != len(y):
        raise ValueError("both samples must have the same length")
    mx, my = mean(x), mean(y)
    sxx = math.fsum((a - mx) ** 2 for a in x)
    if sxx == 0:
        raise ValueError("cannot fit a line to constant x values")
    sxy = math.fsum((a - mx) * (b - my) for a, b in zip(x, y))
    syy = math.fsum((b - my) ** 2 for b in y)
    slope = sxy / sxx
    return LinearFit(slope, my - slope * mx,
                     1.0 if syy == 0 else (sxy * sxy) / (sxx * syy))


def polynomial_regression(xs, ys, degree):
    """Least-squares polynomial fit; coefficients in ascending order."""
    x, y = require(xs, 2), require(ys, 2)
    if len(x) <= degree:
        raise ValueError("need more data points than the degree")
    return Matrix([[v ** p for p in range(degree + 1)] for v in x]).least_squares(y)


def summary(data):
    """The usual descriptive statistics, as a dictionary."""
    values = require(data)
    q1, q2, q3 = quartiles(values)
    result = {"count": float(len(values)), "mean": mean(values), "median": q2,
              "min": min(values), "max": max(values),
              "range": max(values) - min(values),
              "q1": q1, "q3": q3, "iqr": q3 - q1}
    if len(values) > 1:
        result["variance"] = variance(values)
        result["stdev"] = standard_deviation(values)
    return result


def multinomial(*counts):
    """Multinomial coefficient (sum of counts)! / product of count!."""
    result = math.factorial(sum(counts))
    for count in counts:
        result //= math.factorial(count)
    return result


def binomial_pmf(k, n, p):
    """P(X = k) for X ~ Binomial(n, p)."""
    if not 0.0 <= p <= 1.0:
        raise ValueError("p must be between 0 and 1")
    return 0.0 if not 0 <= k <= n else math.comb(n, k) * p ** k * (1 - p) ** (n - k)


def binomial_cdf(k, n, p):
    """P(X <= k) for X ~ Binomial(n, p)."""
    return math.fsum(binomial_pmf(i, n, p) for i in range(min(k, n) + 1))


def poisson_pmf(k, rate):
    """P(X = k) for X ~ Poisson(rate)."""
    if rate < 0:
        raise ValueError("rate must be non-negative")
    if k < 0:
        return 0.0
    if rate == 0:
        return float(k == 0)
    return math.exp(-rate + k * math.log(rate) - math.lgamma(k + 1))


def poisson_cdf(k, rate):
    """P(X <= k) for X ~ Poisson(rate)."""
    return math.fsum(poisson_pmf(i, rate) for i in range(max(k, -1) + 1))


def normal_pdf(x, mu=0.0, sigma=1.0):
    """Density of the normal distribution."""
    if sigma <= 0:
        raise ValueError("sigma must be positive")
    z = (x - mu) / sigma
    return math.exp(-0.5 * z * z) / (sigma * math.sqrt(2 * math.pi))


def normal_cdf(x, mu=0.0, sigma=1.0):
    """Cumulative distribution of the normal distribution, via erf."""
    if sigma <= 0:
        raise ValueError("sigma must be positive")
    return 0.5 * (1 + math.erf((x - mu) / (sigma * math.sqrt(2))))


def normal_quantile(p, mu=0.0, sigma=1.0):
    """Inverse normal CDF, by bisection on normal_cdf."""
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


def exponential_cdf(x, rate=1.0):
    """Cumulative distribution of the exponential distribution."""
    if rate <= 0:
        raise ValueError("rate must be positive")
    return 1 - math.exp(-rate * x) if x >= 0 else 0.0


def confidence_interval(data, level=0.95):
    """Normal-approximation confidence interval for the mean."""
    if not 0.0 < level < 1.0:
        raise ValueError("level must be strictly between 0 and 1")
    values = require(data, 2)
    centre = mean(values)
    margin = normal_quantile(0.5 + level / 2) * \
        standard_deviation(values) / math.sqrt(len(values))
    return centre - margin, centre + margin


# ===========================================================================
# 7. GEOMETRY - plane and solid geometry
# ===========================================================================

def distance(p, q):
    """Euclidean distance between two points of any dimension."""
    if len(p) != len(q):
        raise ValueError("points must have the same dimension")
    return math.sqrt(math.fsum((a - b) ** 2 for a, b in zip(p, q)))


def midpoint_of(p, q):
    """The midpoint of the segment pq."""
    return [(a + b) / 2.0 for a, b in zip(p, q)]


def line_through(p, q):
    """The line through p and q as (a, b, c) with ax + by = c."""
    a, b = q[1] - p[1], p[0] - q[0]
    if a == 0 and b == 0:
        raise ValueError("the two points coincide")
    return a, b, a * p[0] + b * p[1]


def line_intersection(line1, line2):
    """Intersection point of two lines given as (a, b, c)."""
    a1, b1, c1 = line1
    a2, b2, c2 = line2
    determinant = a1 * b2 - a2 * b1
    if abs(determinant) < 1e-14:
        raise ValueError("the lines are parallel or coincident")
    return (c1 * b2 - c2 * b1) / determinant, (a1 * c2 - a2 * c1) / determinant


def point_line_distance(point, p, q):
    """Perpendicular distance from a point to the line through p and q."""
    a, b, c = line_through(p, q)
    return abs(a * point[0] + b * point[1] - c) / math.hypot(a, b)


def circle_area(radius):
    """Area of a circle."""
    if radius < 0:
        raise ValueError("radius must be non-negative")
    return math.pi * radius * radius


def circle_circumference(radius):
    """Circumference of a circle."""
    if radius < 0:
        raise ValueError("radius must be non-negative")
    return 2 * math.pi * radius


def circle_line_intersection(centre, radius, p, q):
    """Points where the line pq meets a circle - zero, one or two of them."""
    dx, dy = q[0] - p[0], q[1] - p[1]
    fx, fy = p[0] - centre[0], p[1] - centre[1]
    a = dx * dx + dy * dy
    if a == 0:
        raise ValueError("the two points defining the line coincide")
    b = 2 * (fx * dx + fy * dy)
    c = fx * fx + fy * fy - radius * radius
    discriminant = b * b - 4 * a * c
    if discriminant < 0:
        return []
    root = math.sqrt(discriminant)
    return sorted((p[0] + t * dx, p[1] + t * dy)
                  for t in {(-b - root) / (2 * a), (-b + root) / (2 * a)})


def sphere_volume(radius):
    """Volume of a sphere."""
    if radius < 0:
        raise ValueError("radius must be non-negative")
    return 4 / 3 * math.pi * radius ** 3


def sphere_surface_area(radius):
    """Surface area of a sphere."""
    if radius < 0:
        raise ValueError("radius must be non-negative")
    return 4 * math.pi * radius * radius


def cylinder_volume(radius, height):
    """Volume of a right circular cylinder."""
    return math.pi * radius * radius * height


def cone_volume(radius, height):
    """Volume of a right circular cone."""
    return math.pi * radius * radius * height / 3


def check_triangle(a, b, c):
    """Raise unless the three lengths can form a triangle."""
    if min(a, b, c) <= 0:
        raise ValueError("side lengths must be positive")
    if a + b <= c or a + c <= b or b + c <= a:
        raise ValueError("sides %g, %g, %g violate the triangle inequality"
                         % (a, b, c))


def triangle_area_sides(a, b, c):
    """Area from three side lengths, by Heron's formula."""
    check_triangle(a, b, c)
    s = 0.5 * (a + b + c)
    return math.sqrt(max(0.0, s * (s - a) * (s - b) * (s - c)))


def triangle_area_vertices(p, q, r):
    """Area of the triangle with the given plane vertices."""
    return abs((q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1])) / 2


def triangle_angles(a, b, c, degrees=True):
    """The three angles opposite sides a, b and c."""
    check_triangle(a, b, c)

    def angle(opposite, x, y):
        cosine = max(-1.0, min(1.0, (x * x + y * y - opposite * opposite) / (2 * x * y)))
        return math.degrees(math.acos(cosine)) if degrees else math.acos(cosine)

    return angle(a, b, c), angle(b, a, c), angle(c, a, b)


def law_of_cosines(b, c, angle_a, degrees=True):
    """The side opposite angle_a, given the two sides around it."""
    radians = math.radians(angle_a) if degrees else angle_a
    return math.sqrt(b * b + c * c - 2 * b * c * math.cos(radians))


def law_of_sines(a, angle_a, angle_b, degrees=True):
    """The side opposite angle_b, given side a opposite angle_a."""
    ra = math.radians(angle_a) if degrees else angle_a
    rb = math.radians(angle_b) if degrees else angle_b
    if math.sin(ra) == 0:
        raise ValueError("angle_a cannot be a multiple of 180 degrees")
    return a * math.sin(rb) / math.sin(ra)


def solve_triangle_sss(a, b, c):
    """Fully solve a triangle from three sides."""
    return {"sides": (a, b, c), "angles": triangle_angles(a, b, c),
            "area": triangle_area_sides(a, b, c), "perimeter": a + b + c}


def solve_triangle_sas(b, angle_a, c, degrees=True):
    """Fully solve a triangle from two sides and the angle between them."""
    return solve_triangle_sss(law_of_cosines(b, c, angle_a, degrees), b, c)


def is_right_triangle(a, b, c, tolerance=1e-9):
    """Whether the three lengths satisfy the Pythagorean theorem."""
    x, y, z = sorted((a, b, c))
    return abs(x * x + y * y - z * z) <= tolerance * max(1.0, z * z)


def polygon_area(vertices):
    """Area of a simple polygon, by the shoelace formula."""
    if len(vertices) < 3:
        raise ValueError("a polygon needs at least three vertices")
    total = 0.0
    for i, (x1, y1) in enumerate(vertices):
        x2, y2 = vertices[(i + 1) % len(vertices)]
        total += x1 * y2 - x2 * y1
    return abs(total) / 2


def polygon_perimeter(vertices):
    """Total edge length of a closed polygon."""
    return math.fsum(distance(vertices[i], vertices[(i + 1) % len(vertices)])
                     for i in range(len(vertices)))


def polygon_centroid(vertices):
    """Centroid (centre of mass) of a simple polygon."""
    if len(vertices) < 3:
        raise ValueError("a polygon needs at least three vertices")
    cx = cy = signed = 0.0
    for i, (x1, y1) in enumerate(vertices):
        x2, y2 = vertices[(i + 1) % len(vertices)]
        step = x1 * y2 - x2 * y1
        signed += step
        cx += (x1 + x2) * step
        cy += (y1 + y2) * step
    if abs(signed) < 1e-14:
        raise ValueError("degenerate polygon has no centroid")
    signed *= 0.5
    return cx / (6 * signed), cy / (6 * signed)


def regular_polygon_area(sides, side_length):
    """Area of a regular polygon."""
    if sides < 3:
        raise ValueError("a polygon needs at least three sides")
    return sides * side_length ** 2 / (4 * math.tan(math.pi / sides))


def point_in_polygon(point, vertices):
    """Whether a point lies inside a polygon, by the ray casting rule."""
    if len(vertices) < 3:
        raise ValueError("a polygon needs at least three vertices")
    x, y, inside = point[0], point[1], False
    for i, (x1, y1) in enumerate(vertices):
        x2, y2 = vertices[(i - 1) % len(vertices)]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


def convex_hull(points):
    """Convex hull of a point set (Andrew's monotone chain)."""
    unique = sorted({(float(p[0]), float(p[1])) for p in points})
    if len(unique) < 3:
        return unique
    turn = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - \
        (a[1] - o[1]) * (b[0] - o[0])
    lower = []
    for p in unique:
        while len(lower) >= 2 and turn(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper = []
    for p in reversed(unique):
        while len(upper) >= 2 and turn(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


# ===========================================================================
# 8. INTERPOLATION - interpolants and curve fitting
# ===========================================================================

def check_points(points, minimum=2):
    """Coerce points to floats, checking the x values are distinct."""
    data = [(float(x), float(y)) for x, y in points]
    if len(data) < minimum:
        raise ValueError("at least %d points are required" % minimum)
    xs = [x for x, _ in data]
    if len(set(xs)) != len(xs):
        raise ValueError("x values must be distinct")
    return data


def lagrange(points):
    """Lagrange interpolating polynomial, as a callable."""
    data = check_points(points, 1)

    def interpolant(x):
        total = 0.0
        for i, (xi, yi) in enumerate(data):
            term = yi
            for j, (xj, _) in enumerate(data):
                if i != j:
                    term *= (x - xj) / (xi - xj)
            total += term
        return total

    return interpolant


def newton_interpolation(points):
    """Newton's divided-difference interpolant."""
    data = check_points(points, 1)
    n = len(data)
    table = [[0.0] * n for _ in range(n)]
    for i, (_, y) in enumerate(data):
        table[i][0] = y
    for j in range(1, n):
        for i in range(n - j):
            table[i][j] = (table[i + 1][j - 1] - table[i][j - 1]) / \
                (data[i + j][0] - data[i][0])
    coefficients = table[0]

    def interpolant(x):
        total, product = 0.0, 1.0
        for i, c in enumerate(coefficients):
            total += c * product
            product *= x - data[i][0]
        return total

    return interpolant


def linear_interpolation(points):
    """Piecewise linear interpolation, extrapolating with the end segments."""
    data = sorted(check_points(points))

    def interpolant(x):
        if x <= data[0][0]:
            left, right = data[0], data[1]
        elif x >= data[-1][0]:
            left, right = data[-2], data[-1]
        else:
            index = 0
            while data[index + 1][0] < x:
                index += 1
            left, right = data[index], data[index + 1]
        return left[1] + (x - left[0]) / (right[0] - left[0]) * (right[1] - left[1])

    return interpolant


def cubic_spline(points):
    """Natural cubic spline (second derivative zero at both ends)."""
    data = sorted(check_points(points, 3))
    n = len(data) - 1
    xs = [p[0] for p in data]
    ys = [p[1] for p in data]
    h = [xs[i + 1] - xs[i] for i in range(n)]

    alpha = [0.0] * (n + 1)
    for i in range(1, n):
        alpha[i] = 3 * ((ys[i + 1] - ys[i]) / h[i] - (ys[i] - ys[i - 1]) / h[i - 1])
    l, mu, z = [1.0] + [0.0] * n, [0.0] * (n + 1), [0.0] * (n + 1)
    for i in range(1, n):                                  # Thomas algorithm
        l[i] = 2 * (xs[i + 1] - xs[i - 1]) - h[i - 1] * mu[i - 1]
        mu[i] = h[i] / l[i]
        z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i]
    c, b, d = [0.0] * (n + 1), [0.0] * n, [0.0] * n
    for i in range(n - 1, -1, -1):
        c[i] = z[i] - mu[i] * c[i + 1]
        b[i] = (ys[i + 1] - ys[i]) / h[i] - h[i] * (c[i + 1] + 2 * c[i]) / 3
        d[i] = (c[i + 1] - c[i]) / (3 * h[i])

    def interpolant(x):
        if x <= xs[0]:
            index = 0
        elif x >= xs[n]:
            index = n - 1
        else:
            low, high = 0, n - 1
            while low < high:
                mid = (low + high + 1) // 2
                low, high = (mid, high) if xs[mid] <= x else (low, mid - 1)
            index = low
        dx = x - xs[index]
        return ys[index] + dx * (b[index] + dx * (c[index] + dx * d[index]))

    return interpolant


def chebyshev_nodes(n, a=-1.0, b=1.0):
    """Chebyshev nodes on [a, b] - the points that tame Runge's phenomenon."""
    if n < 1:
        raise ValueError("n must be at least 1")
    return [0.5 * (a + b) + 0.5 * (b - a) * math.cos((2 * k + 1) * math.pi / (2 * n))
            for k in range(n)]


def exponential_fit(points):
    """Fit y = a * exp(b x) by regressing on log y; returns (a, b)."""
    data = check_points(points)
    if any(y <= 0 for _, y in data):
        raise ValueError("exponential fit requires positive y values")
    fit = linear_regression([x for x, _ in data], [math.log(y) for _, y in data])
    return math.exp(fit.intercept), fit.slope


def power_fit(points):
    """Fit y = a * x**b on a log-log scale; returns (a, b)."""
    data = check_points(points)
    if any(x <= 0 or y <= 0 for x, y in data):
        raise ValueError("power fit requires positive x and y values")
    fit = linear_regression([math.log(x) for x, _ in data],
                            [math.log(y) for _, y in data])
    return math.exp(fit.intercept), fit.slope


# ===========================================================================
# 9. PLOTTING - ASCII graphs, tables, histograms
# ===========================================================================

def safe(f, x):
    """Evaluate f at x, returning nan instead of raising."""
    try:
        value = float(f(x))
    except (ValueError, ZeroDivisionError, OverflowError, ArithmeticError):
        return math.nan
    return value if math.isfinite(value) else math.nan


def plot(f, a, b, width=72, height=22, label="f(x)"):
    """Render f over [a, b] as an ASCII line graph with labelled axes."""
    if b <= a:
        raise ValueError("b must be greater than a")
    if width < 10 or height < 5:
        raise ValueError("the plot is too small to draw")

    xs = [a + (b - a) * i / (width - 1) for i in range(width)]
    ys = [safe(f, x) for x in xs]
    finite = [y for y in ys if not math.isnan(y)]
    if not finite:
        return "%s: no finite values on [%g, %g]" % (label, a, b)

    low, high = min(finite), max(finite)
    if high - low < 1e-12:
        low, high = low - 1, high + 1
    padding = 0.05 * (high - low)
    low, high = low - padding, high + padding
    grid = [[" "] * width for _ in range(height)]
    row_of = lambda v: min(height - 1, max(0, height - 1 - int(
        round((v - low) / (high - low) * (height - 1)))))

    if low <= 0 <= high:                                   # axes first
        grid[row_of(0.0)] = ["-"] * width
    if a <= 0 <= b:
        column = int(round((0 - a) / (b - a) * (width - 1)))
        for row in range(height):
            grid[row][column] = "|" if grid[row][column] == " " else "+"

    previous = None
    for column, y in enumerate(ys):
        if math.isnan(y):
            previous = None
            continue
        row = row_of(y)
        if previous is not None and abs(row - previous) > 1:   # join steep runs
            step = 1 if row > previous else -1
            for filler in range(previous + step, row, step):
                grid[filler][column] = ":"
        grid[row][column] = "*"
        previous = row

    labels = {0: "%10.4g" % high, height - 1: "%10.4g" % low}
    labels.setdefault(height // 2, "%10.4g" % ((low + high) / 2))
    lines = ["%s on [%g, %g]" % (label, a, b)]
    for row in range(height):
        lines.append("%s |%s" % (labels.get(row, " " * 10), "".join(grid[row])))
    lines.append(" " * 11 + "+" + "-" * width)
    left_text, mid_text, right_text = "%g" % a, "%g" % ((a + b) / 2), "%g" % b
    spacing = width - len(left_text) - len(mid_text) - len(right_text)
    half = max(1, spacing // 2)
    lines.append(" " * 12 + left_text + " " * half + mid_text
                 + " " * max(1, spacing - half) + right_text)
    return "\n".join(lines)


def table(f, a, b, steps=20, label="f(x)"):
    """A two-column table of f sampled evenly over [a, b]."""
    if steps < 1:
        raise ValueError("steps must be at least 1")
    lines = ["%14s  %18s" % ("x", label), "%s  %s" % ("-" * 14, "-" * 18)]
    for i in range(steps + 1):
        x = a + (b - a) * i / steps
        y = safe(f, x)
        lines.append("%14.6g  %18s" % (x, "undefined" if math.isnan(y)
                                       else "%.10g" % y))
    return "\n".join(lines)


def histogram(data, bins=10, width=40):
    """A horizontal histogram with equal-width bins."""
    values = [float(x) for x in data]
    if not values:
        raise ValueError("no data to plot")
    if bins < 1:
        raise ValueError("bins must be at least 1")
    low, high = min(values), max(values)
    if high == low:
        high = low + 1
    counts = [0] * bins
    for value in values:
        counts[min(bins - 1, int((value - low) / (high - low) * bins))] += 1
    peak = max(counts) or 1
    lines = []
    for i, count in enumerate(counts):
        left = low + (high - low) * i / bins
        right = low + (high - low) * (i + 1) / bins
        bar = "#" * int(round(count / peak * width))
        lines.append("[%9.4g, %9.4g)  %-*s %d" % (left, right, width, bar, count))
    return "\n".join(lines)


def bar_chart(items, width=40):
    """A labelled bar chart for (name, value) pairs."""
    pairs = [(str(name), float(value)) for name, value in items]
    if not pairs:
        raise ValueError("no items to plot")
    peak = max(abs(v) for _, v in pairs) or 1.0
    label_width = max(len(name) for name, _ in pairs)
    return "\n".join(
        "%*s  %-*s %g" % (label_width, name, width,
                          "#" * int(round(abs(value) / peak * width)), value)
        for name, value in pairs)


# ===========================================================================
# 10. COMMAND LINE INTERFACE
# ===========================================================================

def number_argument(text):
    """Parse a CLI numeric argument, allowing expressions such as pi/2."""
    lowered = text.strip().lower()
    if lowered in {"inf", "+inf", "infinity"}:
        return math.inf
    if lowered in {"-inf", "-infinity"}:
        return -math.inf
    return float(evaluate(text))


def bindings(assignments):
    """Turn ['x=1', 'y=2'] into {'x': 1.0, 'y': 2.0}."""
    result = {}
    for item in assignments or []:
        if "=" not in item:
            raise SystemExit("error: expected NAME=VALUE, got %r" % item)
        name, _, value = item.partition("=")
        result[name.strip()] = number_argument(value)
    return result


def pairs_from(items, what="X,Y pairs"):
    """Parse ['1,2', '3,4'] into [(1.0, 2.0), (3.0, 4.0)]."""
    points = []
    for item in items:
        x, _, y = item.partition(",")
        if not y:
            raise SystemExit("error: expected %s, got %r" % (what, item))
        points.append((number_argument(x), number_argument(y)))
    return points


def show_complex(z, places=10):
    """Render a complex number, hiding a negligible imaginary part."""
    real = z.real + 0.0 if z.real else 0.0          # normalize -0.0 away
    if abs(z.imag) < 1e-12:
        return "%.*g" % (places, real)
    return "%.*g %s %.*gi" % (places, real, "+" if z.imag >= 0 else "-",
                              places, abs(z.imag))


def cmd_eval(args):
    """Evaluate an expression."""
    print("%.12g" % evaluate(args.expression, bindings(args.var)))
    return 0


def cmd_simplify(args):
    """Simplify an expression symbolically."""
    print(simplify(parse(args.expression)))
    return 0


def cmd_diff(args):
    """Differentiate an expression, symbolically or numerically."""
    tree = parse(args.expression)
    if args.numeric:
        if args.at is None:
            raise SystemExit("error: --numeric requires --at")
        f = compile_function(tree, args.variable)
        print("%.12g" % nth_derivative(f, args.at, args.order))
        return 0
    result = differentiate(tree, args.variable, args.order)
    operator = ("d/d%s" % args.variable if args.order == 1
                else "d^%d/d%s^%d" % (args.order, args.variable, args.order))
    print("%s [%s] = %s" % (operator, tree, result))
    if args.at is not None:
        values = bindings(args.var)
        values[args.variable] = args.at
        print("at %s = %g: %.12g" % (args.variable, args.at,
                                     result.evaluate(values)))
    return 0


def cmd_integrate(args):
    """Compute a definite integral."""
    f = compile_function(args.expression, args.variable)
    value = integrate(f, args.lower, args.upper, method=args.method)
    print("integral of %s d%s from %g to %g = %.12g"
          % (args.expression, args.variable, args.lower, args.upper, value))
    return 0


def cmd_limit(args):
    """Estimate a limit."""
    f = compile_function(args.expression, args.variable)
    try:
        value = limit(f, args.point, args.side)
    except ValueError as error:
        print("limit does not exist: %s" % error)
        return 1
    print("lim %s -> %g [%s] = %.12g"
          % (args.variable, args.point, args.expression, value))
    return 0


def cmd_taylor(args):
    """Print the Taylor series of an expression."""
    try:                                     # exact, where the rules allow it
        tree = parse(args.expression)
        coefficients = [differentiate(tree, args.variable, n).evaluate(
            {args.variable: args.at}) / math.factorial(n)
            for n in range(args.order + 1)]
    except (ValueError, NameError, ZeroDivisionError, OverflowError, ParseError):
        coefficients = taylor_coefficients(
            compile_function(args.expression, args.variable), args.at, args.order)

    terms = []
    for power, coefficient in enumerate(coefficients):
        if abs(coefficient) < 1e-9:
            continue
        value = round(coefficient, 9)
        if power == 0:
            terms.append("%g" % value)
            continue
        shift = args.variable if args.at == 0 else "(%s - %g)" % (args.variable, args.at)
        body = shift if power == 1 else "%s^%d" % (shift, power)
        if abs(abs(value) - 1) < 1e-12:
            terms.append(("-" if value < 0 else "") + body)
        else:
            terms.append("%g*%s" % (value, body))
    print(" + ".join(terms).replace("+ -", "- ") if terms else "0")
    return 0


def cmd_solve(args):
    """Find the real roots of an expression over an interval."""
    f = compile_function(args.expression, args.variable)
    roots = find_all_roots(f, args.lower, args.upper, args.samples)
    if not roots:
        print("no sign change found on [%g, %g]" % (args.lower, args.upper))
        return 1
    for root in roots:
        print("%s = %.12g" % (args.variable, root))
    return 0


def cmd_roots(args):
    """Find every root of a polynomial given by its coefficients."""
    coefficients = [number_argument(c) for c in args.coefficients]
    polynomial = Polynomial(coefficients[::-1] if args.descending else coefficients)
    print("p(x) = %s" % polynomial)
    for root in polynomial.roots():
        print("  x = %s" % show_complex(root))
    return 0


def cmd_poly(args):
    """Inspect a polynomial: value, derivative, integral and roots."""
    coefficients = [number_argument(c) for c in args.coefficients]
    p = Polynomial(coefficients[::-1] if args.descending else coefficients)
    print("p(x)      = %s" % p)
    print("degree    = %d" % p.degree)
    print("p'(x)     = %s" % p.derivative())
    print("integral  = %s + C" % p.antiderivative())
    print("roots     = " + ", ".join(show_complex(r) for r in p.roots()))
    if args.at is not None:
        print("%-9s = %.12g" % ("p(%g)" % args.at, p(args.at)))
    if args.range:
        low, high = args.range
        print("area over [%g, %g] = %.12g" % (low, high, p.integrate(low, high)))
    return 0


def cmd_matrix(args):
    """Analyse a matrix: determinant, inverse, rank, eigenvalues and more."""
    joined = ";".join(args.rows)
    matrix = Matrix([[number_argument(cell) for cell in row.replace(",", " ").split()]
                     for row in joined.split(";") if row.strip()])
    print("A =")
    print(matrix)
    rows, columns = matrix.shape
    print("\nshape     = %d x %d" % (rows, columns))
    print("rank      = %d" % matrix.rank())
    print("transpose =")
    print(matrix.transpose())
    if rows == columns:
        determinant = matrix.determinant()
        print("\ntrace       = %.12g" % matrix.trace())
        print("determinant = %.12g" % determinant)
        if abs(determinant) > 1e-12:
            print("inverse =")
            print(matrix.inverse())
        else:
            print("inverse     = none (matrix is singular)")
        try:
            print("eigenvalues = " + ", ".join("%.10g" % v
                                               for v in matrix.eigenvalues()))
        except (ValueError, SingularMatrixError) as error:
            print("eigenvalues = unavailable (%s)" % error)
    if args.solve:
        try:
            solution = matrix.solve([number_argument(v) for v in args.solve])
        except (ValueError, SingularMatrixError) as error:
            print("\nsolve: %s" % error)
            return 1
        print("\nsolution of A x = b:")
        for i, value in enumerate(solution):
            print("  x%d = %.12g" % (i + 1, value))
    return 0


def cmd_stats(args):
    """Summarize a sample of numbers."""
    data = [number_argument(v) for v in args.numbers]
    for name, value in summary(data).items():
        print("%9s = %.10g" % (name, value))
    print("%9s = %s" % ("mode", ", ".join("%g" % m for m in mode(data))))
    if len(data) > 2:
        low, high = confidence_interval(data)
        print("%9s = [%.10g, %.10g]" % ("95% CI", low, high))
    if args.histogram:
        print()
        print(histogram(data, args.bins))
    return 0


def cmd_regress(args):
    """Fit a line or polynomial through x,y pairs."""
    points = pairs_from(args.points)
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    if args.degree == 1:
        print(linear_regression(xs, ys))
        print("correlation = %.10g" % correlation(xs, ys))
    else:
        print("p(x) = %s" % Polynomial(polynomial_regression(xs, ys, args.degree)))
    return 0


def cmd_interpolate(args):
    """Interpolate through data points and evaluate the result."""
    points = pairs_from(args.points)
    builders = {"lagrange": lagrange, "newton": newton_interpolation,
                "linear": linear_interpolation, "spline": cubic_spline}
    f = builders[args.method](points)
    if args.method in {"lagrange", "newton"}:
        print("p(x) = %s" % Polynomial.interpolate(points))
    if args.at is not None:
        print("f(%g) = %.12g" % (args.at, f(args.at)))
    else:
        print(table(f, min(x for x, _ in points), max(x for x, _ in points),
                    10, "%s fit" % args.method))
    return 0


def cmd_primes(args):
    """List the primes up to a limit."""
    found = primes_up_to(args.limit)
    print("%d primes up to %d" % (len(found), args.limit))
    if not args.count_only:
        for start in range(0, len(found), 12):
            print(" ".join("%7d" % p for p in found[start:start + 12]))
    return 0


def cmd_factor(args):
    """Factorize integers and report their divisor structure."""
    for value in args.numbers:
        n = int(value)
        rendered = " * ".join("%d^%d" % (p, e) if e > 1 else str(p)
                              for p, e in sorted(factorize(n).items()))
        print("%d = %s" % (n, rendered or "1"))
        print("    prime      : %s" % is_prime(n))
        if n > 0:
            print("    divisors   : %s" % divisors(n))
            print("    sigma      : %d" % divisor_sum(n))
            print("    totient    : %d" % totient(n))
    return 0


def cmd_gcd(args):
    """Greatest common divisor, least common multiple and Bezout."""
    values = [int(v) for v in args.numbers]
    print("gcd = %d" % gcd(*values))
    print("lcm = %d" % lcm(*values))
    if len(values) == 2:
        g, x, y = extended_gcd(*values)
        print("Bezout: %d*(%d) + %d*(%d) = %d" % (values[0], x, values[1], y, g))
    return 0


def cmd_sequence(args):
    """Print terms of a classic integer sequence."""
    name, n = args.name, args.n
    if name == "fibonacci":
        print(" ".join(str(v) for v in fibonacci_sequence(n)))
    elif name == "primes":
        print(" ".join(str(nth_prime(i)) for i in range(1, n + 1)))
    elif name == "catalan":
        print(" ".join(str(catalan(i)) for i in range(n)))
    elif name == "triangular":
        print(" ".join(str(k * (k + 1) // 2) for k in range(1, n + 1)))
    elif name == "collatz":
        sequence = collatz(n)
        print(" ".join(str(v) for v in sequence))
        print("(%d steps, peak %d)" % (len(sequence) - 1, max(sequence)))
    elif name == "harmonic":
        for k in range(1, n + 1):
            value = harmonic_number(k)
            print("H(%d) = %s = %.10f" % (k, value, float(value)))
    elif name == "bernoulli":
        for k in range(n + 1):
            print("B(%d) = %s" % (k, bernoulli(k)))
    return 0


def cmd_convert(args):
    """Convert an integer between bases."""
    value = int(args.number, args.from_base)
    print("%s (base %d) = %s (base %d)"
          % (args.number, args.from_base, to_base(value, args.to_base), args.to_base))
    print("decimal = %d" % value)
    return 0


def cmd_triangle(args):
    """Solve a triangle from three sides, or two sides and the angle between."""
    if args.angle is None:
        if args.c is None:
            raise SystemExit("error: give three sides, or two sides and --angle")
        result = solve_triangle_sss(args.a, args.b, args.c)
    else:
        result = solve_triangle_sas(args.a, args.angle, args.b)
    a, b, c = result["sides"]
    alpha, beta, gamma = result["angles"]
    print("sides     : a = %.10g, b = %.10g, c = %.10g" % (a, b, c))
    print("angles    : A = %.6f deg, B = %.6f deg, C = %.6f deg"
          % (alpha, beta, gamma))
    print("perimeter : %.10g" % result["perimeter"])
    print("area      : %.10g" % result["area"])
    print("right     : %s" % is_right_triangle(a, b, c))
    return 0


def cmd_polygon(args):
    """Area, perimeter, centroid and hull of a polygon."""
    vertices = pairs_from(args.vertices, "X,Y vertices")
    print("vertices  : %d" % len(vertices))
    print("area      : %.10g" % polygon_area(vertices))
    print("perimeter : %.10g" % polygon_perimeter(vertices))
    cx, cy = polygon_centroid(vertices)
    print("centroid  : (%.10g, %.10g)" % (cx, cy))
    hull = convex_hull(vertices)
    print("hull      : " + ", ".join("(%g, %g)" % point for point in hull))
    print("convex    : %s" % (len(hull) == len(vertices)))
    return 0


def cmd_ode(args):
    """Solve the initial value problem y' = f(t, y)."""
    tree = parse(args.expression)
    path = solve_ode(lambda t, y: tree.evaluate({"t": t, "y": y}),
                     args.y0, args.t0, args.t1, args.steps, args.method)
    print("y' = %s,  y(%g) = %g  [%s]"
          % (args.expression, args.t0, args.y0, args.method))
    print("%14s  %18s" % ("t", "y"))
    print("%s  %s" % ("-" * 14, "-" * 18))
    stride = max(1, len(path) // max(1, args.rows))
    shown = path[::stride]
    if shown[-1] != path[-1]:
        shown.append(path[-1])
    for t, y in shown:
        print("%14.6g  %18.10g" % (t, y))
    return 0


def cmd_plot(args):
    """Draw an ASCII graph of an expression."""
    f = compile_function(args.expression, args.variable)
    print(plot(f, args.lower, args.upper, args.width, args.height, args.expression))
    return 0


def cmd_table(args):
    """Print a table of values for an expression."""
    f = compile_function(args.expression, args.variable)
    print(table(f, args.lower, args.upper, args.steps, args.expression))
    return 0


def cmd_repl(args):
    """Start the interactive calculator."""
    return run_repl()


REPL_HELP = """\
Interactive calculator.

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


def repl_line(line, memory):
    """Interpret one REPL line and return the text to display."""
    words = line.split()
    head = words[0].lower()

    if head.startswith("d/d") and len(head) > 3:
        variable = head[3:]
        body = line[len(words[0]):].strip()
        return "d/d%s [%s] = %s" % (variable, body, differentiate(body, variable))

    if head in {"int", "integrate"} and len(words) >= 4:
        body = " ".join(words[1:-2])
        value = integrate(compile_function(body, "x"),
                          number_argument(words[-2]), number_argument(words[-1]))
        return "= %.12g" % value

    if head == "solve" and len(words) >= 4:
        body = " ".join(words[1:-2])
        roots = find_all_roots(compile_function(body, "x"),
                               number_argument(words[-2]), number_argument(words[-1]))
        if not roots:
            return "no real roots found in that interval"
        return "\n".join("x = %.12g" % root for root in roots)

    if head == "plot" and len(words) >= 4:
        body = " ".join(words[1:-2])
        return plot(compile_function(body, "x"), number_argument(words[-2]),
                    number_argument(words[-1]), label=body)

    if "=" in line and not any(op in line.split("=")[0] for op in "<>!+-*/^("):
        name, _, body = line.partition("=")
        value = evaluate(body.strip(), memory)
        memory[name.strip()] = value
        return "%s = %.12g" % (name.strip(), value)

    value = evaluate(line, memory)
    memory["ans"] = value
    return "= %.12g" % value


def run_repl():
    """Run the read-eval-print loop until the user quits."""
    print("Maths calculator - type 'help' for commands, 'quit' to exit")
    memory = {}
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
            print(REPL_HELP)
            continue
        if lowered == "vars":
            if memory:
                for name, value in sorted(memory.items()):
                    print("  %s = %.12g" % (name, value))
            else:
                print("  (no variables stored)")
            continue
        try:
            print(repl_line(line, memory))
        except (ParseError, ValueError, NameError, ZeroDivisionError,
                OverflowError, ArithmeticError) as error:
            print("error: %s" % error)


def build_parser():
    """Build the full command line parser."""
    parser = argparse.ArgumentParser(
        prog="calc",
        description="A mathematics calculator: calculus, algebra, linear "
                    "algebra, number theory, statistics and geometry.",
        epilog="Run with no arguments for an interactive session.")
    parser.add_argument("--version", action="version", version="calc 1.0")
    subparsers = parser.add_subparsers(dest="command", metavar="COMMAND")

    def add(name, help_text, function):
        sub = subparsers.add_parser(name, help=help_text, description=help_text)
        sub.set_defaults(function=function)
        return sub

    p = add("eval", "Evaluate an expression.", cmd_eval)
    p.add_argument("expression")
    p.add_argument("--var", action="append", metavar="NAME=VALUE")

    p = add("simplify", "Simplify an expression symbolically.", cmd_simplify)
    p.add_argument("expression")

    p = add("diff", "Differentiate an expression.", cmd_diff)
    p.add_argument("expression")
    p.add_argument("-v", "--variable", default="x")
    p.add_argument("-n", "--order", type=int, default=1)
    p.add_argument("--at", type=number_argument)
    p.add_argument("--numeric", action="store_true")
    p.add_argument("--var", action="append", metavar="NAME=VALUE")

    p = add("integrate", "Compute a definite integral.", cmd_integrate)
    p.add_argument("expression")
    p.add_argument("lower", type=number_argument)
    p.add_argument("upper", type=number_argument)
    p.add_argument("-v", "--variable", default="x")
    p.add_argument("-m", "--method", default="adaptive",
                   choices=["adaptive", "romberg", "simpson", "trapezoid",
                            "midpoint", "gauss"])

    p = add("limit", "Estimate a limit.", cmd_limit)
    p.add_argument("expression")
    p.add_argument("point", type=number_argument)
    p.add_argument("-v", "--variable", default="x")
    p.add_argument("-s", "--side", default="both", choices=["both", "left", "right"])

    p = add("taylor", "Expand an expression as a Taylor series.", cmd_taylor)
    p.add_argument("expression")
    p.add_argument("-n", "--order", type=int, default=5)
    p.add_argument("--at", type=number_argument, default=0.0)
    p.add_argument("-v", "--variable", default="x")

    p = add("ode", "Solve y' = f(t, y) numerically.", cmd_ode)
    p.add_argument("expression", help="right-hand side in terms of t and y")
    p.add_argument("--y0", type=number_argument, required=True)
    p.add_argument("--t0", type=number_argument, default=0.0)
    p.add_argument("--t1", type=number_argument, required=True)
    p.add_argument("--steps", type=int, default=1000)
    p.add_argument("--rows", type=int, default=10)
    p.add_argument("-m", "--method", default="rk4", choices=["rk4", "euler"])

    p = add("solve", "Find the real roots of an expression.", cmd_solve)
    p.add_argument("expression")
    p.add_argument("lower", type=number_argument)
    p.add_argument("upper", type=number_argument)
    p.add_argument("-v", "--variable", default="x")
    p.add_argument("--samples", type=int, default=2000)

    p = add("roots", "Find every root of a polynomial.", cmd_roots)
    p.add_argument("coefficients", nargs="+",
                   help="ascending powers, e.g. -6 11 -6 1")
    p.add_argument("-d", "--descending", action="store_true")

    p = add("poly", "Inspect a polynomial.", cmd_poly)
    p.add_argument("coefficients", nargs="+")
    p.add_argument("-d", "--descending", action="store_true")
    p.add_argument("--at", type=number_argument)
    p.add_argument("--range", nargs=2, type=number_argument, metavar=("A", "B"))

    p = add("matrix", "Analyse a matrix.", cmd_matrix)
    p.add_argument("rows", nargs="+", help='rows like "1,2;3,4" or "1 2" "3 4"')
    p.add_argument("--solve", nargs="+", metavar="B")

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
    p.add_argument("--at", type=number_argument)

    p = add("triangle", "Solve a triangle.", cmd_triangle)
    p.add_argument("a", type=number_argument)
    p.add_argument("b", type=number_argument)
    p.add_argument("c", type=number_argument, nargs="?")
    p.add_argument("--angle", type=number_argument,
                   help="the angle in degrees between sides a and b")

    p = add("polygon", "Measure a polygon.", cmd_polygon)
    p.add_argument("vertices", nargs="+", metavar="X,Y")

    p = add("plot", "Draw an ASCII graph of an expression.", cmd_plot)
    p.add_argument("expression")
    p.add_argument("lower", type=number_argument)
    p.add_argument("upper", type=number_argument)
    p.add_argument("-v", "--variable", default="x")
    p.add_argument("--width", type=int, default=72)
    p.add_argument("--height", type=int, default=22)

    p = add("table", "Tabulate an expression.", cmd_table)
    p.add_argument("expression")
    p.add_argument("lower", type=number_argument)
    p.add_argument("upper", type=number_argument)
    p.add_argument("-v", "--variable", default="x")
    p.add_argument("--steps", type=int, default=20)

    add("repl", "Start the interactive calculator.", cmd_repl)
    return parser


# argparse only lets an argument beginning with '-' through as a positional
# when it looks like a negative number, and its built-in pattern covers plain
# digits only. Widen it so '-inf', '-pi' and '-2*pi' reach the commands that
# take interval endpoints.
NEGATIVE_VALUE = re.compile(r"^-(\d|\.\d|inf|infinity|pi|e\b|tau)", re.IGNORECASE)


def allow_negative_values(parser):
    """Apply the widened negative-number pattern to a parser and its children."""
    parser._negative_number_matcher = NEGATIVE_VALUE
    for action in parser._actions:
        if isinstance(action, argparse._SubParsersAction):
            for subparser in action.choices.values():
                allow_negative_values(subparser)


def main(argv=None):
    """Entry point: parse arguments and dispatch to a command."""
    parser = build_parser()
    allow_negative_values(parser)
    args = parser.parse_args(argv)
    if not getattr(args, "function", None):
        return run_repl()
    try:
        return args.function(args)
    except ParseError as error:
        print("parse error: %s" % error, file=sys.stderr)
        return 2
    except (ValueError, NameError, ZeroDivisionError, OverflowError,
            ArithmeticError) as error:
        print("error: %s" % error, file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print()
        return 130


if __name__ == "__main__":
    sys.exit(main())
