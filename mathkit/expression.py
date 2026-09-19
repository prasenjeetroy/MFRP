"""Parse, evaluate, differentiate and simplify mathematical expressions.

This module implements a small computer algebra system in pure Python: a
tokenizer, a recursive-descent parser producing an abstract syntax tree, a
numeric evaluator, a symbolic differentiator and a simplifier.

    >>> expr = parse("x**2 * sin(x)")
    >>> expr.evaluate({"x": 0.0})
    0.0
    >>> print(differentiate(expr, "x"))
    2 * x * sin(x) + x ** 2 * cos(x)
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Callable, Dict, List, Sequence, Tuple

__all__ = [
    "Node",
    "Number",
    "Variable",
    "UnaryOp",
    "BinaryOp",
    "Call",
    "ParseError",
    "parse",
    "evaluate",
    "differentiate",
    "simplify",
    "compile_function",
    "CONSTANTS",
    "FUNCTIONS",
]


class ParseError(ValueError):
    """Raised when an expression cannot be tokenized or parsed."""


# --------------------------------------------------------------------------
# Built-in constants and functions
# --------------------------------------------------------------------------

CONSTANTS: Dict[str, float] = {
    "pi": math.pi,
    "e": math.e,
    "tau": math.tau,
    "inf": math.inf,
}

FUNCTIONS: Dict[str, Callable[..., float]] = {
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "asin": math.asin,
    "acos": math.acos,
    "atan": math.atan,
    "atan2": math.atan2,
    "sinh": math.sinh,
    "cosh": math.cosh,
    "tanh": math.tanh,
    "exp": math.exp,
    "log": lambda x, base=math.e: math.log(x, base),
    "ln": math.log,
    "log10": math.log10,
    "log2": math.log2,
    "sqrt": math.sqrt,
    "cbrt": lambda x: math.copysign(abs(x) ** (1.0 / 3.0), x),
    "abs": abs,
    "sign": lambda x: math.copysign(1.0, x) if x else 0.0,
    "floor": math.floor,
    "ceil": math.ceil,
    "gamma": math.gamma,
    "erf": math.erf,
    "erfc": math.erfc,
    "degrees": math.degrees,
    "radians": math.radians,
    "hypot": math.hypot,
    "max": max,
    "min": min,
}


# --------------------------------------------------------------------------
# Tokenizer
# --------------------------------------------------------------------------

_OPERATOR_CHARS = "+-*/%^(),"


@dataclass(frozen=True)
class Token:
    kind: str  # "number", "name", "op", "end"
    text: str
    position: int


def tokenize(source: str) -> List[Token]:
    """Split ``source`` into tokens, raising :class:`ParseError` on junk."""
    tokens: List[Token] = []
    i = 0
    n = len(source)
    while i < n:
        char = source[i]
        if char.isspace():
            i += 1
            continue
        if char.isdigit() or (char == "." and i + 1 < n and source[i + 1].isdigit()):
            start = i
            seen_dot = False
            while i < n and (source[i].isdigit() or source[i] == "."):
                if source[i] == ".":
                    if seen_dot:
                        raise ParseError(f"malformed number at position {start}")
                    seen_dot = True
                i += 1
            if i < n and source[i] in "eE":
                lookahead = i + 1
                if lookahead < n and source[lookahead] in "+-":
                    lookahead += 1
                if lookahead < n and source[lookahead].isdigit():
                    i = lookahead
                    while i < n and source[i].isdigit():
                        i += 1
            tokens.append(Token("number", source[start:i], start))
            continue
        if char.isalpha() or char == "_":
            start = i
            while i < n and (source[i].isalnum() or source[i] == "_"):
                i += 1
            tokens.append(Token("name", source[start:i], start))
            continue
        if char == "*" and source.startswith("**", i):
            tokens.append(Token("op", "^", i))
            i += 2
            continue
        if char in _OPERATOR_CHARS:
            tokens.append(Token("op", char, i))
            i += 1
            continue
        raise ParseError(f"unexpected character {char!r} at position {i}")
    tokens.append(Token("end", "", n))
    return tokens


# --------------------------------------------------------------------------
# Abstract syntax tree
# --------------------------------------------------------------------------


class Node:
    """Base class for expression tree nodes."""

    precedence = 100

    def evaluate(self, variables: Dict[str, float] | None = None) -> float:
        raise NotImplementedError

    def variables(self) -> set:
        """Return the set of free variable names in this subtree."""
        raise NotImplementedError

    def __call__(self, **values: float) -> float:
        return self.evaluate(values)

    def _render(self, parent_precedence: int) -> str:
        text = str(self)
        return f"({text})" if self.precedence < parent_precedence else text


@dataclass(frozen=True)
class Number(Node):
    value: float
    precedence = 100

    def evaluate(self, variables: Dict[str, float] | None = None) -> float:
        return self.value

    def variables(self) -> set:
        return set()

    def __str__(self) -> str:
        if self.value == int(self.value) and abs(self.value) < 1e16:
            return str(int(self.value))
        return repr(self.value)


@dataclass(frozen=True)
class Variable(Node):
    name: str
    precedence = 100

    def evaluate(self, variables: Dict[str, float] | None = None) -> float:
        variables = variables or {}
        if self.name in variables:
            return float(variables[self.name])
        if self.name in CONSTANTS:
            return CONSTANTS[self.name]
        raise NameError(f"unknown variable {self.name!r}")

    def variables(self) -> set:
        return set() if self.name in CONSTANTS else {self.name}

    def __str__(self) -> str:
        return self.name


@dataclass(frozen=True)
class UnaryOp(Node):
    op: str
    operand: Node
    precedence = 3

    def evaluate(self, variables: Dict[str, float] | None = None) -> float:
        value = self.operand.evaluate(variables)
        return -value if self.op == "-" else value

    def variables(self) -> set:
        return self.operand.variables()

    def __str__(self) -> str:
        return f"{self.op}{self.operand._render(self.precedence + 1)}"


_BINARY_PRECEDENCE = {"+": 1, "-": 1, "*": 2, "/": 2, "%": 2, "^": 4}


@dataclass(frozen=True)
class BinaryOp(Node):
    op: str
    left: Node
    right: Node

    @property
    def precedence(self) -> int:  # type: ignore[override]
        return _BINARY_PRECEDENCE[self.op]

    def evaluate(self, variables: Dict[str, float] | None = None) -> float:
        left = self.left.evaluate(variables)
        right = self.right.evaluate(variables)
        if self.op == "+":
            return left + right
        if self.op == "-":
            return left - right
        if self.op == "*":
            return left * right
        if self.op == "/":
            if right == 0:
                raise ZeroDivisionError("division by zero in expression")
            return left / right
        if self.op == "%":
            return math.fmod(left, right)
        if self.op == "^":
            if left < 0 and right != int(right):
                raise ValueError("negative base with fractional exponent")
            return left ** right
        raise ParseError(f"unknown operator {self.op!r}")

    def variables(self) -> set:
        return self.left.variables() | self.right.variables()

    def __str__(self) -> str:
        prec = self.precedence
        # '-', '/' and '^' are not associative the way rendering assumes, so
        # the right operand needs parentheses at equal precedence.
        left = self.left._render(prec)
        # '-', '/' and '^' need parentheses around an equal-precedence right
        # operand, because they do not associate the way flat rendering implies.
        right = self.right._render(prec + 1 if self.op in "-/^" else prec)
        symbol = "**" if self.op == "^" else self.op
        return f"{left} {symbol} {right}"


@dataclass(frozen=True)
class Call(Node):
    name: str
    args: Tuple[Node, ...]
    precedence = 100

    def evaluate(self, variables: Dict[str, float] | None = None) -> float:
        func = FUNCTIONS.get(self.name)
        if func is None:
            raise NameError(f"unknown function {self.name!r}")
        return float(func(*(arg.evaluate(variables) for arg in self.args)))

    def variables(self) -> set:
        result: set = set()
        for arg in self.args:
            result |= arg.variables()
        return result

    def __str__(self) -> str:
        inner = ", ".join(str(arg) for arg in self.args)
        return f"{self.name}({inner})"


# --------------------------------------------------------------------------
# Recursive-descent parser
# --------------------------------------------------------------------------


class _Parser:
    def __init__(self, tokens: Sequence[Token]) -> None:
        self.tokens = tokens
        self.index = 0

    @property
    def current(self) -> Token:
        return self.tokens[self.index]

    def advance(self) -> Token:
        token = self.tokens[self.index]
        self.index += 1
        return token

    def expect(self, text: str) -> Token:
        if self.current.kind == "op" and self.current.text == text:
            return self.advance()
        raise ParseError(
            f"expected {text!r} at position {self.current.position}, "
            f"found {self.current.text or 'end of input'!r}"
        )

    def parse(self) -> Node:
        node = self.parse_sum()
        if self.current.kind != "end":
            raise ParseError(
                f"unexpected {self.current.text!r} at position {self.current.position}"
            )
        return node

    def parse_sum(self) -> Node:
        node = self.parse_product()
        while self.current.kind == "op" and self.current.text in "+-":
            op = self.advance().text
            node = BinaryOp(op, node, self.parse_product())
        return node

    def parse_product(self) -> Node:
        node = self.parse_unary()
        while self.current.kind == "op" and self.current.text in "*/%":
            op = self.advance().text
            node = BinaryOp(op, node, self.parse_unary())
        return node

    def parse_unary(self) -> Node:
        if self.current.kind == "op" and self.current.text in "+-":
            op = self.advance().text
            operand = self.parse_unary()
            if op == "-":
                if isinstance(operand, Number):
                    return Number(-operand.value)
                return UnaryOp("-", operand)
            return operand
        return self.parse_power()

    def parse_power(self) -> Node:
        base = self.parse_atom()
        if self.current.kind == "op" and self.current.text == "^":
            self.advance()
            # Exponentiation is right associative and binds tighter than unary
            # minus on its right: 2 ** -3 must parse.
            return BinaryOp("^", base, self.parse_unary())
        return base

    def parse_atom(self) -> Node:
        token = self.current
        if token.kind == "number":
            self.advance()
            return Number(float(token.text))
        if token.kind == "name":
            self.advance()
            if self.current.kind == "op" and self.current.text == "(":
                self.advance()
                args: List[Node] = []
                if not (self.current.kind == "op" and self.current.text == ")"):
                    args.append(self.parse_sum())
                    while self.current.kind == "op" and self.current.text == ",":
                        self.advance()
                        args.append(self.parse_sum())
                self.expect(")")
                return Call(token.text, tuple(args))
            return Variable(token.text)
        if token.kind == "op" and token.text == "(":
            self.advance()
            node = self.parse_sum()
            self.expect(")")
            return node
        raise ParseError(
            f"unexpected {token.text or 'end of input'!r} at position {token.position}"
        )


def parse(source: str) -> Node:
    """Parse ``source`` into an expression tree."""
    if not source or not source.strip():
        raise ParseError("empty expression")
    return _Parser(tokenize(source)).parse()


def evaluate(source: str | Node, variables: Dict[str, float] | None = None) -> float:
    """Evaluate an expression string (or tree) with the given variables."""
    node = parse(source) if isinstance(source, str) else source
    return node.evaluate(variables)


def compile_function(source: str | Node, variable: str = "x") -> Callable[[float], float]:
    """Return a one-argument Python callable for an expression."""
    node = parse(source) if isinstance(source, str) else source

    def function(value: float) -> float:
        return node.evaluate({variable: value})

    function.__doc__ = f"f({variable}) = {node}"
    return function


# --------------------------------------------------------------------------
# Simplification
# --------------------------------------------------------------------------


def _is_number(node: Node, value: float) -> bool:
    return isinstance(node, Number) and node.value == value


def _fold_constant_product(left: Node, right: Node) -> Node | None:
    """Collapse ``c1 * (c2 * u)`` and its mirror images into ``(c1*c2) * u``."""
    for constant, other in ((left, right), (right, left)):
        if not isinstance(constant, Number):
            continue
        if isinstance(other, BinaryOp) and other.op == "*":
            for inner, rest in ((other.left, other.right), (other.right, other.left)):
                if isinstance(inner, Number):
                    return simplify(
                        BinaryOp("*", Number(constant.value * inner.value), rest)
                    )
    return None


def simplify(node: Node) -> Node:
    """Apply constant folding and algebraic identities to ``node``."""
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
        args = tuple(simplify(arg) for arg in node.args)
        if all(isinstance(arg, Number) for arg in args):
            try:
                return Number(Call(node.name, args).evaluate())
            except (ValueError, ZeroDivisionError, OverflowError, NameError):
                pass
        return Call(node.name, args)

    assert isinstance(node, BinaryOp)
    left = simplify(node.left)
    right = simplify(node.right)
    op = node.op

    if isinstance(left, Number) and isinstance(right, Number):
        try:
            return Number(BinaryOp(op, left, right).evaluate())
        except (ValueError, ZeroDivisionError, OverflowError):
            return BinaryOp(op, left, right)

    if op == "+":
        if _is_number(left, 0):
            return right
        if _is_number(right, 0):
            return left
        # Render a + (-b) as the subtraction it really is.
        if isinstance(right, Number) and right.value < 0:
            return BinaryOp("-", left, Number(-right.value))
        if isinstance(right, UnaryOp) and right.op == "-":
            return simplify(BinaryOp("-", left, right.operand))
        if isinstance(left, UnaryOp) and left.op == "-":
            return simplify(BinaryOp("-", right, left.operand))
    elif op == "-":
        if isinstance(right, UnaryOp) and right.op == "-":
            return simplify(BinaryOp("+", left, right.operand))
        if _is_number(right, 0):
            return left
        if _is_number(left, 0):
            return simplify(UnaryOp("-", right))
        if str(left) == str(right):
            return Number(0.0)
    elif op == "*":
        if _is_number(left, 0) or _is_number(right, 0):
            return Number(0.0)
        if _is_number(left, 1):
            return right
        if _is_number(right, 1):
            return left
        if _is_number(left, -1):
            return simplify(UnaryOp("-", right))
        if _is_number(right, -1):
            return simplify(UnaryOp("-", left))
        # Pull a negation out of a product: 4 * -sin(x) becomes -(4 * sin(x)).
        if isinstance(left, UnaryOp) and left.op == "-":
            return simplify(UnaryOp("-", BinaryOp("*", left.operand, right)))
        if isinstance(right, UnaryOp) and right.op == "-":
            return simplify(UnaryOp("-", BinaryOp("*", left, right.operand)))
        # Reassociate so nested constants collapse: 3 * (2 * x) becomes 6 * x.
        folded = _fold_constant_product(left, right)
        if folded is not None:
            return folded
        # Keep the constant on the left so the rules above keep matching.
        if isinstance(right, Number) and not isinstance(left, Number):
            return BinaryOp("*", right, left)
    elif op == "/":
        if _is_number(left, 0):
            return Number(0.0)
        if _is_number(right, 1):
            return left
        if str(left) == str(right):
            return Number(1.0)
    elif op == "^":
        if _is_number(right, 0):
            return Number(1.0)
        if _is_number(right, 1):
            return left
        if _is_number(left, 1):
            return Number(1.0)

    return BinaryOp(op, left, right)


# --------------------------------------------------------------------------
# Symbolic differentiation
# --------------------------------------------------------------------------

_ZERO = Number(0.0)
_ONE = Number(1.0)


def _add(a: Node, b: Node) -> Node:
    return BinaryOp("+", a, b)


def _sub(a: Node, b: Node) -> Node:
    return BinaryOp("-", a, b)


def _mul(a: Node, b: Node) -> Node:
    return BinaryOp("*", a, b)


def _div(a: Node, b: Node) -> Node:
    return BinaryOp("/", a, b)


def _pow(a: Node, b: Node) -> Node:
    return BinaryOp("^", a, b)


def _call(name: str, *args: Node) -> Node:
    return Call(name, tuple(args))


def _derivative_of_call(node: Call, variable: str) -> Node:
    """Return d/dvariable of a function call via the chain rule."""
    name = node.name
    if name in {"atan2", "hypot", "max", "min", "floor", "ceil", "sign"}:
        raise ValueError(f"cannot symbolically differentiate {name!r}")
    if name == "log" and len(node.args) == 2:
        # log(u, b) = ln(u) / ln(b) with constant base b
        if node.args[1].variables() & {variable}:
            raise ValueError("cannot differentiate log with a variable base")
        inner = node.args[0]
        outer = _div(_ONE, _mul(inner, _call("ln", node.args[1])))
        return _mul(outer, differentiate(inner, variable))

    if len(node.args) != 1:
        raise ValueError(f"cannot differentiate {name}/{len(node.args)}")

    u = node.args[0]
    du = differentiate(u, variable)

    outer: Node
    if name == "sin":
        outer = _call("cos", u)
    elif name == "cos":
        outer = UnaryOp("-", _call("sin", u))
    elif name == "tan":
        outer = _div(_ONE, _pow(_call("cos", u), Number(2.0)))
    elif name == "exp":
        outer = _call("exp", u)
    elif name in {"ln", "log"}:
        outer = _div(_ONE, u)
    elif name == "log10":
        outer = _div(_ONE, _mul(u, _call("ln", Number(10.0))))
    elif name == "log2":
        outer = _div(_ONE, _mul(u, _call("ln", Number(2.0))))
    elif name == "sqrt":
        outer = _div(_ONE, _mul(Number(2.0), _call("sqrt", u)))
    elif name == "cbrt":
        outer = _div(_ONE, _mul(Number(3.0), _pow(_call("cbrt", u), Number(2.0))))
    elif name == "sinh":
        outer = _call("cosh", u)
    elif name == "cosh":
        outer = _call("sinh", u)
    elif name == "tanh":
        outer = _sub(_ONE, _pow(_call("tanh", u), Number(2.0)))
    elif name == "asin":
        outer = _div(_ONE, _call("sqrt", _sub(_ONE, _pow(u, Number(2.0)))))
    elif name == "acos":
        outer = UnaryOp("-", _div(_ONE, _call("sqrt", _sub(_ONE, _pow(u, Number(2.0))))))
    elif name == "atan":
        outer = _div(_ONE, _add(_ONE, _pow(u, Number(2.0))))
    elif name == "abs":
        outer = _call("sign", u)
    elif name == "erf":
        outer = _div(
            _mul(Number(2.0), _call("exp", UnaryOp("-", _pow(u, Number(2.0))))),
            _call("sqrt", Variable("pi")),
        )
    elif name == "erfc":
        outer = UnaryOp(
            "-",
            _div(
                _mul(Number(2.0), _call("exp", UnaryOp("-", _pow(u, Number(2.0))))),
                _call("sqrt", Variable("pi")),
            ),
        )
    elif name in {"degrees", "radians"}:
        factor = 180.0 / math.pi if name == "degrees" else math.pi / 180.0
        outer = Number(factor)
    else:
        raise ValueError(f"no derivative rule for {name!r}")

    return _mul(outer, du)


def differentiate(source: str | Node, variable: str = "x", order: int = 1) -> Node:
    """Return the symbolic derivative of ``source`` with respect to ``variable``.

    ``order`` repeats the differentiation, so ``order=2`` gives f''.
    """
    if order < 0:
        raise ValueError("order must be non-negative")
    node = parse(source) if isinstance(source, str) else source
    for _ in range(order):
        node = simplify(_differentiate_once(simplify(node), variable))
    return node if order else simplify(node)


def _differentiate_once(node: Node, variable: str) -> Node:
    if isinstance(node, Number):
        return _ZERO
    if isinstance(node, Variable):
        return _ONE if node.name == variable else _ZERO
    if isinstance(node, UnaryOp):
        return UnaryOp("-", _differentiate_once(node.operand, variable))
    if isinstance(node, Call):
        return _derivative_of_call(node, variable)

    assert isinstance(node, BinaryOp)
    left, right = node.left, node.right
    dleft = _differentiate_once(left, variable)
    dright = _differentiate_once(right, variable)

    if node.op == "+":
        return _add(dleft, dright)
    if node.op == "-":
        return _sub(dleft, dright)
    if node.op == "*":
        return _add(_mul(dleft, right), _mul(left, dright))
    if node.op == "/":
        return _div(_sub(_mul(dleft, right), _mul(left, dright)), _pow(right, Number(2.0)))
    if node.op == "^":
        exponent_is_constant = variable not in right.variables()
        base_is_constant = variable not in left.variables()
        if exponent_is_constant and base_is_constant:
            return _ZERO
        if exponent_is_constant:
            # d/dx u^n = n * u^(n-1) * u'
            new_exponent = simplify(_sub(right, _ONE))
            return _mul(_mul(right, _pow(left, new_exponent)), dleft)
        if base_is_constant:
            # d/dx a^v = a^v * ln(a) * v'
            return _mul(_mul(_pow(left, right), _call("ln", left)), dright)
        # General case: u^v = exp(v ln u)
        inner = _add(_mul(dright, _call("ln", left)), _div(_mul(right, dleft), left))
        return _mul(_pow(left, right), inner)
    if node.op == "%":
        raise ValueError("cannot differentiate the modulo operator")
    raise ValueError(f"cannot differentiate operator {node.op!r}")
