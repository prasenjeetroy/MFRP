"""Tests for the expression parser, evaluator and symbolic differentiator."""

import unittest

from mathkit.calculus import derivative
from mathkit.expression import (
    ParseError,
    compile_function,
    differentiate,
    evaluate,
    parse,
    simplify,
)


class TestParsing(unittest.TestCase):
    def test_arithmetic_precedence(self):
        self.assertEqual(evaluate("2 + 3 * 4"), 14.0)
        self.assertEqual(evaluate("(2 + 3) * 4"), 20.0)
        self.assertEqual(evaluate("2 ** 3 ** 2"), 512.0)  # right associative
        self.assertEqual(evaluate("10 - 4 - 3"), 3.0)  # left associative
        self.assertEqual(evaluate("2 ** -2"), 0.25)
        self.assertEqual(evaluate("-2 ** 2"), -4.0)

    def test_both_power_spellings(self):
        self.assertEqual(evaluate("2 ^ 10"), evaluate("2 ** 10"))

    def test_constants_and_functions(self):
        self.assertAlmostEqual(evaluate("sin(pi / 2)"), 1.0)
        self.assertAlmostEqual(evaluate("ln(e)"), 1.0)
        self.assertAlmostEqual(evaluate("log(8, 2)"), 3.0)
        self.assertAlmostEqual(evaluate("hypot(3, 4)"), 5.0)

    def test_variables(self):
        self.assertEqual(evaluate("x * y + 1", {"x": 2, "y": 3}), 7.0)
        with self.assertRaises(NameError):
            evaluate("x + 1")

    def test_scientific_notation(self):
        self.assertEqual(evaluate("1.5e3"), 1500.0)
        self.assertEqual(evaluate("2e-2"), 0.02)

    def test_round_trips_through_its_own_rendering(self):
        for source in ["x ** 2 - (x - 1)", "1 / (x + 2)", "2 ** (3 - x)",
                       "-(x + 1) * 3", "x - (1 - x)"]:
            tree = parse(source)
            reparsed = parse(str(tree))
            self.assertAlmostEqual(
                tree.evaluate({"x": 1.7}), reparsed.evaluate({"x": 1.7}), places=12,
                msg=f"rendering of {source!r} did not round-trip",
            )

    def test_errors(self):
        for bad in ["", "   ", "2 +", "(1 + 2", "1 $ 2", "sin(", "1..2"]:
            with self.assertRaises(ParseError, msg=bad):
                parse(bad)

    def test_division_by_zero(self):
        with self.assertRaises(ZeroDivisionError):
            evaluate("1 / 0")

    def test_variables_listing(self):
        self.assertEqual(parse("x*y + sin(z) + pi").variables(), {"x", "y", "z"})


class TestSimplify(unittest.TestCase):
    def test_identities(self):
        self.assertEqual(str(simplify(parse("x * 1"))), "x")
        self.assertEqual(str(simplify(parse("x + 0"))), "x")
        self.assertEqual(str(simplify(parse("x * 0"))), "0")
        self.assertEqual(str(simplify(parse("x ** 1"))), "x")
        self.assertEqual(str(simplify(parse("x ** 0"))), "1")
        self.assertEqual(str(simplify(parse("x / x"))), "1")

    def test_constant_folding(self):
        self.assertEqual(str(simplify(parse("2 * 3 + 4"))), "10")
        self.assertEqual(str(simplify(parse("2 * (3 * x)"))), "6 * x")


class TestDifferentiation(unittest.TestCase):
    def test_known_derivatives(self):
        cases = {
            "x": "1",
            "x ** 2": "2 * x",
            "x ** 3": "3 * x ** 2",
            "sin(x)": "cos(x)",
            "cos(x)": "-sin(x)",
            "exp(x)": "exp(x)",
            "ln(x)": "1 / x",
            "5": "0",
        }
        for source, expected in cases.items():
            self.assertEqual(str(differentiate(source, "x")), expected, msg=source)

    def test_higher_order(self):
        self.assertEqual(str(differentiate("x ** 4", "x", 2)), "12 * x ** 2")
        self.assertEqual(str(differentiate("sin(x)", "x", 4)), "sin(x)")
        self.assertEqual(str(differentiate("x ** 2", "x", 3)), "0")

    def test_partial_derivative_treats_others_as_constant(self):
        self.assertEqual(str(differentiate("x * y", "x")), "y")
        self.assertEqual(str(differentiate("x * y", "y")), "x")

    def test_matches_finite_differences(self):
        sources = [
            "x ** 3 * sin(x)", "exp(-x ** 2)", "ln(x ** 2 + 1)", "tan(x) / x",
            "sqrt(x ** 2 + 3)", "x ** x", "atan(x) * cosh(x)", "1 / (x ** 2 + 1)",
            "erf(x)", "log(x, 2)", "tanh(3 * x)", "(x + 1) ** 5 / (x ** 2 + 2)",
            "asin(x / 4)", "2 ** x", "cbrt(x)",
        ]
        for source in sources:
            tree = parse(source)
            exact = compile_function(differentiate(tree, "x"), "x")
            numeric = compile_function(tree, "x")
            for x in (0.4, 0.9, 1.3, 1.9):
                self.assertAlmostEqual(
                    exact(x), derivative(numeric, x), places=6, msg=f"{source} at {x}",
                )

    def test_undifferentiable_functions_are_rejected(self):
        for source in ["floor(x)", "atan2(x, 2)", "x % 2", "max(x, 1)"]:
            with self.assertRaises(ValueError, msg=source):
                differentiate(source, "x")


if __name__ == "__main__":
    unittest.main()
