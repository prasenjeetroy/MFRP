#!/usr/bin/env python3
"""A small calculus calculator: evaluate, differentiate, integrate.

Ordinary calculator functions (sin, cos, sqrt, ln, exp, ...) plus symbolic
differentiation, numerical integration, limits, Taylor series and roots.
Standard library only, Python 3.

    python3 calculus_calc.py          start the interactive calculator
    python3 calculus_calc.py "2+3*4"  evaluate one thing and exit

    ev(parse("sin(pi/2) + log(8, 2)"))  -> 4.0
    text(diff("x**2*sin(x)", "x"))      -> '2 * x * sin(x) + x ** 2 * cos(x)'
"""

import math
import sys

CONSTANTS = {"pi": math.pi, "e": math.e, "tau": math.tau, "inf": math.inf}

FUNCTIONS = {
    "sin": math.sin, "cos": math.cos, "tan": math.tan, "asin": math.asin,
    "acos": math.acos, "atan": math.atan, "sinh": math.sinh, "cosh": math.cosh,
    "tanh": math.tanh, "exp": math.exp, "ln": math.log, "log10": math.log10,
    "log": lambda x, b=math.e: math.log(x, b), "sqrt": math.sqrt, "abs": abs,
    "floor": math.floor, "ceil": math.ceil, "erf": math.erf, "gamma": math.gamma,
    "sign": lambda x: math.copysign(1.0, x) if x else 0.0}

BINARY = {
    "+": lambda a, b: a + b,
    "-": lambda a, b: a - b,
    "*": lambda a, b: a * b,
    "/": lambda a, b: a / b if b else _fail(ZeroDivisionError("division by zero")),
    "^": lambda a, b: a ** b if a >= 0 or b == int(b)
         else _fail(ValueError("negative base with fractional exponent")),
}

PRECEDENCE = {"+": 1, "-": 1, "*": 2, "/": 2, "neg": 3, "^": 4}

def _fail(error):
    """Raise from inside a lambda."""
    raise error

class ParseError(ValueError):
    """Raised when an expression cannot be tokenized or parsed."""
# -- Parser.  Trees are nested tuples: ('num',3.0) ('var','x') ('neg',a)
#    ('+',a,b) ('fn','sin',(a,)) --

def tokenize(source):
    """Split an expression into (kind, text) tokens."""
    tokens, i, n = [], 0, len(source)
    while i < n:
        c = source[i]
        if c.isspace(): i += 1
        elif c.isdigit() or (c == "." and i + 1 < n and source[i + 1].isdigit()):
            start, dot = i, False
            while i < n and (source[i].isdigit() or source[i] == "."):
                if source[i] == "." and dot:
                    raise ParseError("malformed number at position %d" % start)
                dot = dot or source[i] == "."
                i += 1
            if i < n and source[i] in "eE":                         # 1.5e-3
                j = i + 1 + (i + 1 < n and source[i + 1] in "+-")
                if j < n and source[j].isdigit():
                    i = j
                    while i < n and source[i].isdigit():
                        i += 1
            tokens.append(("num", source[start:i]))
        elif c.isalpha() or c == "_":
            start = i
            while i < n and (source[i].isalnum() or source[i] == "_"):
                i += 1
            tokens.append(("name", source[start:i]))
        elif source.startswith("**", i):
            tokens.append(("op", "^"))
            i += 2
        elif c in "+-*/^(),":
            tokens.append(("op", c))
            i += 1
        else: raise ParseError("unexpected character %r at position %d" % (c, i))
    return tokens + [("end", "")]

def parse(source):
    """Parse an expression string into a tree."""
    if not source or not source.strip(): raise ParseError("empty expression")
    tokens, at = tokenize(source), [0]
    peek = lambda: tokens[at[0]]

    def take():
        at[0] += 1
        return tokens[at[0] - 1]

    def total():                                  # sum := term (('+'|'-') term)*
        node = term()
        while peek()[0] == "op" and peek()[1] in "+-":
            node = (take()[1], node, term())
        return node

    def term():                                   # product := unary (('*'|'/') unary)*
        node = unary()
        while peek()[0] == "op" and peek()[1] in "*/":
            node = (take()[1], node, unary())
        return node

    def unary():
        if peek()[0] == "op" and peek()[1] in "+-":
            op, operand = take()[1], unary()
            if op != "-": return operand
            return ("num", -operand[1]) if operand[0] == "num" else ("neg", operand)
        base = atom()
        if peek() == ("op", "^"):                 # '^' is right associative
            take()
            return ("^", base, unary())
        return base

    def atom():
        kind, body = take()
        if kind == "num": return ("num", float(body))
        if kind == "name":
            if peek() != ("op", "("): return ("var", body)
            take()
            args = []
            if peek() != ("op", ")"):
                args.append(total())
                while peek() == ("op", ","):
                    take()
                    args.append(total())
            if take() != ("op", ")"): raise ParseError("missing ')'")
            return ("fn", body, tuple(args))
        if (kind, body) == ("op", "("):
            node = total()
            if take() != ("op", ")"): raise ParseError("missing ')'")
            return node
        raise ParseError("unexpected %r" % (body or "end of input"))

    tree = total()
    if peek()[0] != "end": raise ParseError("unexpected %r" % peek()[1])
    return tree

# -- Evaluation and rendering --

def ev(node, variables=None):
    """Evaluate a tree; variables is a {name: value} dict."""
    variables, kind = variables or {}, node[0]
    if kind == "num": return node[1]
    if kind == "var":
        if node[1] in variables: return float(variables[node[1]])
        if node[1] in CONSTANTS: return CONSTANTS[node[1]]
        raise NameError("unknown variable %r" % node[1])
    if kind == "neg": return -ev(node[1], variables)
    if kind == "fn":
        if node[1] not in FUNCTIONS: raise NameError("unknown function %r" % node[1])
        return float(FUNCTIONS[node[1]](*(ev(a, variables) for a in node[2])))
    return BINARY[kind](ev(node[1], variables), ev(node[2], variables))

def func(source, variable="x"):
    """Turn an expression into a one-argument Python function."""
    tree = parse(source) if isinstance(source, str) else source
    return lambda value: ev(tree, {variable: value})

def text(node, outer=0):
    """Render a tree as a string, bracketing only where it is needed."""
    kind = node[0]
    if kind == "num":
        return str(int(node[1])) if node[1] == int(node[1]) and abs(node[1]) < 1e16 \
            else repr(node[1])
    if kind == "var": return node[1]
    if kind == "fn": return "%s(%s)" % (node[1], ", ".join(text(a) for a in node[2]))
    if kind == "neg":
        body, prec = "-" + text(node[1], PRECEDENCE["neg"] + 1), PRECEDENCE["neg"]
    else:
        prec = PRECEDENCE[kind]
        # '-', '/' and '^' need brackets on an equal-precedence right operand.
        body = "%s %s %s" % (text(node[1], prec), "**" if kind == "^" else kind,
                             text(node[2], prec + 1 if kind in "-/^" else prec))
    return "(%s)" % body if prec < outer else body

# -- Simplification and symbolic differentiation --

def isnum(node, value):
    """Whether a node is exactly the given number."""
    return node[0] == "num" and node[1] == value

def simp(node):
    """Fold constants and apply the obvious algebraic identities."""
    kind = node[0]
    if kind in ("num", "var"): return node
    if kind == "neg":
        a = simp(node[1])
        return ("num", -a[1]) if a[0] == "num" else (a[1] if a[0] == "neg" else ("neg", a))
    if kind == "fn":
        args = tuple(simp(a) for a in node[2])
        if all(a[0] == "num" for a in args):
            try:
                return ("num", ev(("fn", node[1], args)))
            except (ValueError, ZeroDivisionError, OverflowError, NameError):
                pass
        return ("fn", node[1], args)

    a, b = simp(node[1]), simp(node[2])
    if a[0] == "num" and b[0] == "num":
        try:
            return ("num", ev((kind, a, b)))
        except (ValueError, ZeroDivisionError, OverflowError):
            return (kind, a, b)
    if kind == "+":
        if isnum(a, 0): return b
        if isnum(b, 0): return a
        if b[0] == "num" and b[1] < 0:                    # a + -3  ->  a - 3
            return ("-", a, ("num", -b[1]))
        if b[0] == "neg": return simp(("-", a, b[1]))
        if a[0] == "neg": return simp(("-", b, a[1]))
    elif kind == "-":
        if b[0] == "neg": return simp(("+", a, b[1]))
        if isnum(b, 0): return a
        if isnum(a, 0): return simp(("neg", b))
        if text(a) == text(b): return ("num", 0.0)
    elif kind == "*":
        if isnum(a, 0) or isnum(b, 0): return ("num", 0.0)
        if isnum(a, 1): return b
        if isnum(b, 1): return a
        if isnum(a, -1): return simp(("neg", b))
        if isnum(b, -1): return simp(("neg", a))
        if a[0] == "neg":                                 # pull the sign outwards
            return simp(("neg", ("*", a[1], b)))
        if b[0] == "neg": return simp(("neg", ("*", a, b[1])))
        for x, y in ((a, b), (b, a)):                     # 3 * (2 * u)  ->  6 * u
            if x[0] == "num" and y[0] == "*":
                for inner, rest in ((y[1], y[2]), (y[2], y[1])):
                    if inner[0] == "num":
                        return simp(("*", ("num", x[1] * inner[1]), rest))
        if b[0] == "num":
            return ("*", b, a)                            # constants on the left
    elif kind == "/":
        if isnum(a, 0): return ("num", 0.0)
        if isnum(b, 1): return a
        if text(a) == text(b): return ("num", 1.0)
    elif kind == "^":
        if isnum(b, 0) or isnum(a, 1): return ("num", 1.0)
        if isnum(b, 1): return a
    return (kind, a, b)


ONE, TWO, ZERO = ("num", 1.0), ("num", 2.0), ("num", 0.0)
SQRT = lambda u: ("fn", "sqrt", (u,))

# d/du of each function, keyed by name, applied to the parsed argument.
DERIVATIVES = {
    "sin": lambda u: ("fn", "cos", (u,)),
    "cos": lambda u: ("neg", ("fn", "sin", (u,))),
    "tan": lambda u: ("/", ONE, ("^", ("fn", "cos", (u,)), TWO)),
    "exp": lambda u: ("fn", "exp", (u,)),
    "ln": lambda u: ("/", ONE, u),
    "log10": lambda u: ("/", ONE, ("*", u, ("fn", "ln", (("num", 10.0),)))),
    "sqrt": lambda u: ("/", ONE, ("*", TWO, SQRT(u))),
    "sinh": lambda u: ("fn", "cosh", (u,)),
    "cosh": lambda u: ("fn", "sinh", (u,)),
    "tanh": lambda u: ("-", ONE, ("^", ("fn", "tanh", (u,)), TWO)),
    "asin": lambda u: ("/", ONE, SQRT(("-", ONE, ("^", u, TWO)))),
    "acos": lambda u: ("neg", ("/", ONE, SQRT(("-", ONE, ("^", u, TWO))))),
    "atan": lambda u: ("/", ONE, ("+", ONE, ("^", u, TWO))),
    "abs": lambda u: ("fn", "sign", (u,)),
    "erf": lambda u: ("/", ("*", TWO, ("fn", "exp", (("neg", ("^", u, TWO)),))),
                      SQRT(("var", "pi"))),
}

def uses(node, variable):
    """Whether the variable appears anywhere in the tree."""
    if node[0] == "num": return False
    if node[0] == "var": return node[1] == variable
    if node[0] == "fn": return any(uses(a, variable) for a in node[2])
    return any(uses(a, variable) for a in node[1:])

def diff(source, variable="x", order=1):
    """Symbolic derivative; order=2 gives the second derivative, and so on."""
    node = parse(source) if isinstance(source, str) else source
    for _ in range(order):
        node = simp(d1(simp(node), variable))
    return node if order else simp(node)

def d1(node, variable):
    """One application of the differentiation rules."""
    kind = node[0]
    if kind == "num": return ZERO
    if kind == "var": return ONE if node[1] == variable else ZERO
    if kind == "neg": return ("neg", d1(node[1], variable))
    if kind == "fn":
        name, args = node[1], node[2]
        if name == "log" and len(args) == 2:                    # log(u, base)
            if uses(args[1], variable):
                raise ValueError("cannot differentiate log with a variable base")
            return ("*", ("/", ONE, ("*", args[0], ("fn", "ln", (args[1],)))),
                    d1(args[0], variable))
        rule = DERIVATIVES.get("ln" if name == "log" else name)
        if rule is None or len(args) != 1:
            raise ValueError("no derivative rule for %r" % name)
        return ("*", rule(args[0]), d1(args[0], variable))      # chain rule

    a, b = node[1], node[2]
    da, db = d1(a, variable), d1(b, variable)
    if kind == "+": return ("+", da, db)
    if kind == "-": return ("-", da, db)
    if kind == "*":                                             # product rule
        return ("+", ("*", da, b), ("*", a, db))
    if kind == "/":                                             # quotient rule
        return ("/", ("-", ("*", da, b), ("*", a, db)), ("^", b, TWO))
    if not uses(b, variable):                                   # '^' with u^n
        return ZERO if not uses(a, variable) else \
            ("*", ("*", b, ("^", a, simp(("-", b, ONE)))), da)
    if not uses(a, variable):                                   # c^v
        return ("*", ("*", ("^", a, b), ("fn", "ln", (a,))), db)
    return ("*", ("^", a, b),                                   # u^v
            ("+", ("*", db, ("fn", "ln", (a,))), ("/", ("*", b, da), a)))

# -- Numerical calculus --

def derivative(f, x, h=None):
    """Numerical derivative by a five-point central difference."""
    h = h or (abs(x) + 1.0) * 1e-5
    return (f(x - 2 * h) - 8 * f(x - h) + 8 * f(x + h) - f(x + 2 * h)) / (12 * h)

def simpson(f, a, b, n=1000):
    """Composite Simpson's rule with n subintervals."""
    n += n % 2
    h = (b - a) / n
    return h / 3 * (f(a) + f(b) + sum(f(a + i * h) * (4 if i % 2 else 2)
                                      for i in range(1, n)))

def integrate(f, a, b, tolerance=1e-10):
    """Definite integral by adaptive Simpson; infinite limits are allowed."""
    if a == b: return 0.0
    if b < a: return -integrate(f, b, a, tolerance)
    if math.isinf(a) or math.isinf(b):
        edge = 1 - 1e-9                            # substitute onto a finite range
        if math.isinf(a) and math.isinf(b):        # x = t / (1 - t^2)
            return simpson(lambda t: f(t / (1 - t * t)) * (1 + t * t)
                           / (1 - t * t) ** 2, -edge, edge, 200)
        if math.isinf(b):                          # x = a + t / (1 - t)
            return simpson(lambda t: f(a + t / (1 - t)) / (1 - t) ** 2, 0, edge, 200)
        return simpson(lambda t: f(b - t / (1 - t)) / (1 - t) ** 2, 0, edge, 200)

    panel = lambda lo, hi, flo, fmid, fhi: (hi - lo) * (flo + 4 * fmid + fhi) / 6

    def step(lo, hi, flo, fmid, fhi, whole, tol, depth):
        mid = 0.5 * (lo + hi)
        fl, fr = f(0.5 * (lo + mid)), f(0.5 * (mid + hi))
        left, right = panel(lo, mid, flo, fl, fmid), panel(mid, hi, fmid, fr, fhi)
        if depth <= 0 or abs(left + right - whole) <= 15 * tol:
            return left + right + (left + right - whole) / 15
        return (step(lo, mid, flo, fl, fmid, left, tol / 2, depth - 1)
                + step(mid, hi, fmid, fr, fhi, right, tol / 2, depth - 1))

    mid = 0.5 * (a + b)
    fa, fm, fb = f(a), f(mid), f(b)
    return step(a, b, fa, fm, fb, panel(a, b, fa, fm, fb), tolerance, 50)

def limit(f, x, side="both"):
    """Estimate a limit by sampling towards x and extrapolating."""
    def approach(direction):
        h, values = 0.1, []
        for _ in range(16):          # stop near 1e-6; closer loses to rounding
            try:
                value = f(x + direction * h)
            except (ZeroDivisionError, ValueError, OverflowError):
                h /= 2
                continue
            if not math.isfinite(value): break
            values.append(value)
            h /= 2
        if not values: raise ValueError("function undefined near the limit point")
        tail = values[-5:]           # a tail growing without bound means infinity
        if len(tail) == 5 and abs(tail[-1]) > 1e4 and all(
                abs(q) > abs(p) * 1.5 and p * q > 0 for p, q in zip(tail, tail[1:])):
            return math.copysign(math.inf, tail[-1])
        for _ in range(6):           # Aitken's delta-squared process
            if len(values) < 3: break
            nxt = []
            for i in range(len(values) - 2):
                p, q, r = values[i:i + 3]
                bottom = r - 2 * q + p
                candidate = r if abs(bottom) < 1e-300 else p - (q - p) ** 2 / bottom
                if math.isfinite(candidate): nxt.append(candidate)
            if not nxt: break
            values = nxt
        return values[-1]

    if side != "both": return approach(-1 if side == "left" else 1)
    left, right = approach(-1), approach(1)
    disagree = (left != right) if math.isinf(left) or math.isinf(right) else \
        abs(left - right) > 1e-5 * max(1.0, abs(left), abs(right))
    if disagree:
        raise ValueError("limit does not exist: %r from the left, %r from the right"
                         % (left, right))
    return left if math.isinf(left) else 0.5 * (left + right)

def taylor(source, variable="x", centre=0.0, order=5):
    """Taylor coefficients [f(a), f'(a), f''(a)/2!, ...], found symbolically."""
    tree = parse(source) if isinstance(source, str) else source
    return [ev(diff(tree, variable, n), {variable: centre}) / math.factorial(n)
            for n in range(order + 1)]

def series(source, variable="x", centre=0.0, order=5):
    """The Taylor series written out as a readable string."""
    terms = []
    for power, c in enumerate(taylor(source, variable, centre, order)):
        if abs(c) < 1e-9: continue
        c = round(c, 9)
        shift = variable if centre == 0 else "(%s - %g)" % (variable, centre)
        body = shift if power == 1 else "%s^%d" % (shift, power)
        terms.append("%g" % c if power == 0 else
                     ("-" if c < 0 else "") + body if abs(abs(c) - 1) < 1e-12 else
                     "%g*%s" % (c, body))
    return " + ".join(terms).replace("+ -", "- ") if terms else "0"

def solve(source, guess=1.0, variable="x", tolerance=1e-12):
    """Find a root near a starting guess, by Newton's method."""
    f, x = func(source, variable), float(guess)
    for _ in range(100):
        value = f(x)
        if abs(value) < tolerance: return x
        slope = derivative(f, x)
        if abs(slope) < 1e-14: raise ValueError("derivative vanished near x = %g" % x)
        x -= value / slope
    raise ValueError("no root found starting from %g" % guess)

# -- Interactive calculator --

HELP = """\
  <expression>       evaluate, e.g. 2+3*4, sin(pi/2), sqrt(2)**2
  x = <expression>   store a variable for later expressions
  d/dx <expr>        symbolic derivative with respect to x
  int <expr> a b     integrate expr from a to b  (a, b may be -inf / inf)
  lim <expr> a       limit of expr as x approaches a
  taylor <expr> n    Taylor series of expr about 0, to order n
  solve <expr> g     root of expr found from the guess g
  vars / help / quit
Functions: sin cos tan asin acos atan sinh cosh tanh exp ln log log10 sqrt
abs floor ceil erf gamma.  Constants: pi e tau."""

def value_of(word):
    """Read a number, allowing 'pi/2', '-inf' and other expressions."""
    lowered = word.strip().lower()
    if lowered in ("inf", "+inf"): return math.inf
    return -math.inf if lowered == "-inf" else ev(parse(word))

def run(line, memory):
    """Interpret one line of input and return the text to print."""
    words = line.split()
    head = words[0].lower()
    if head.startswith("d/d") and len(head) > 3:
        body = line[len(words[0]):].strip()
        return "d/d%s [%s] = %s" % (head[3:], body, text(diff(body, head[3:])))
    if head in ("int", "integrate") and len(words) >= 4:
        return "= %.12g" % integrate(func(" ".join(words[1:-2])),
                                     value_of(words[-2]), value_of(words[-1]))
    if head in ("lim", "limit") and len(words) >= 3:
        return "= %.12g" % limit(func(" ".join(words[1:-1])), value_of(words[-1]))
    if head == "taylor" and len(words) >= 3:
        return series(" ".join(words[1:-1]), order=int(words[-1]))
    if head == "solve" and len(words) >= 3:
        return "x = %.12g" % solve(" ".join(words[1:-1]), value_of(words[-1]))
    if "=" in line and not any(c in line.split("=")[0] for c in "<>!+-*/^("):
        name, _, body = line.partition("=")
        memory[name.strip()] = ev(parse(body.strip()), memory)
        return "%s = %.12g" % (name.strip(), memory[name.strip()])
    memory["ans"] = ev(parse(line), memory)
    return "= %.12g" % memory["ans"]

ERRORS = (ParseError, ValueError, NameError, ZeroDivisionError, ArithmeticError)

def main(argv):
    """Evaluate the arguments, or start the calculator if there are none."""
    memory = {}
    if argv:
        try:
            print(run(" ".join(argv), memory))
            return 0
        except ERRORS as error:
            print("error: %s" % error, file=sys.stderr)
            return 1
    print("Calculus calculator - 'help' for commands, 'quit' to exit")
    while True:
        try:
            line = input(">>> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return 0
        word = line.lower()
        if not line: continue
        if word in ("quit", "exit"): return 0
        try:
            if word in ("help", "?"): print(HELP)
            elif word == "vars":
                print("\n".join("  %s = %.12g" % kv for kv in sorted(memory.items()))
                      or "  (nothing stored)")
            else: print(run(line, memory))
        except ERRORS as error:
            print("error: %s" % error)


if __name__ == "__main__": sys.exit(main(sys.argv[1:]))
