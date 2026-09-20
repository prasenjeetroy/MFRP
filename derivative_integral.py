"""Derivatives and integrals of a function you type in.

You type something like  x**2 + sin(x)  and it works out the derivative at
a point and the definite integral between two limits, numerically.

Run it:   python3 derivative_integral.py
"""

import math

# The names your typed function is allowed to use.
ALLOWED = {
    "sin": math.sin, "cos": math.cos, "tan": math.tan, "asin": math.asin,
    "acos": math.acos, "atan": math.atan, "sinh": math.sinh,
    "cosh": math.cosh, "tanh": math.tanh, "exp": math.exp, "log": math.log,
    "ln": math.log, "log10": math.log10, "sqrt": math.sqrt, "abs": abs,
    "pi": math.pi, "e": math.e,
}


def make_function(expression):
    """Turn a typed string such as 'x**2 + sin(x)' into a Python function."""
    code = compile(expression.replace("^", "**"), "<typed function>", "eval")
    return lambda x: float(eval(code, {"__builtins__": {}}, dict(ALLOWED, x=x)))


def derivative(f, x, h=1e-5):
    """The slope of f at x, by a central difference."""
    return (f(x + h) - f(x - h)) / (2 * h)


def second_derivative(f, x, h=1e-4):
    """The curvature of f at x."""
    return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h)


def integral(f, a, b, n=1000):
    """The area under f between a and b, by Simpson's rule."""
    if n % 2:
        n += 1                       # Simpson's rule needs an even number of strips
    h = (b - a) / n
    total = f(a) + f(b)
    for i in range(1, n):
        total += f(a + i * h) * (4 if i % 2 else 2)
    return total * h / 3


def ask(question):
    """Ask a question until the answer is a number."""
    while True:
        try:
            return float(eval(input(question), {"__builtins__": {}}, ALLOWED))
        except Exception:
            print("  that is not a number - try again, e.g. 0, 2.5 or pi")


def main():
    print("Derivative and integral calculator")
    print("Type a function of x, for example:  x**2 + sin(x)")
    print("You can use: sin cos tan exp ln log10 sqrt abs, and pi and e.\n")

    while True:
        typed = input("f(x) = ").strip()
        if typed.lower() in ("quit", "exit", ""):
            return
        try:
            f = make_function(typed)
            f(1.0)                                    # check it actually runs
        except Exception as error:
            print("  cannot read that function: %s\n" % error)
            continue

        x = ask("differentiate at x = ")
        try:
            print("  f(%g)  = %.10g" % (x, f(x)))
            print("  f'(%g) = %.10g" % (x, derivative(f, x)))
            print("  f''(%g) = %.10g" % (x, second_derivative(f, x)))
        except Exception as error:
            print("  cannot work out the derivative there: %s" % error)

        a = ask("integrate from a = ")
        b = ask("             to b = ")
        try:
            print("  integral of %s from %g to %g = %.10g\n" % (typed, a, b,
                                                                integral(f, a, b)))
        except Exception as error:
            print("  cannot work out that integral: %s\n" % error)


if __name__ == "__main__":
    main()
