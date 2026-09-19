"""End-to-end tests for the command line interface."""

import io

import unittest
from contextlib import redirect_stderr, redirect_stdout

from mathkit.cli import _evaluate_repl_line, main


def run(*argv):
    """Run the CLI and return ``(exit_code, stdout, stderr)``."""
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        code = main(list(argv))
    return code, out.getvalue(), err.getvalue()


class TestCalculusCommands(unittest.TestCase):
    def test_eval(self):
        code, out, _ = run("eval", "2 + 3 * 4")
        self.assertEqual(code, 0)
        self.assertEqual(out.strip(), "14")

    def test_eval_with_variables(self):
        code, out, _ = run("eval", "x**2 + y", "--var", "x=3", "--var", "y=1")
        self.assertEqual(code, 0)
        self.assertEqual(out.strip(), "10")

    def test_simplify(self):
        _, out, _ = run("simplify", "x*1 + 0 + 2*3")
        self.assertEqual(out.strip(), "x + 6")

    def test_diff(self):
        _, out, _ = run("diff", "x**3")
        self.assertIn("3 * x ** 2", out)

    def test_diff_at_a_point(self):
        _, out, _ = run("diff", "x**3", "--at", "2")
        self.assertIn("12", out)

    def test_higher_order_diff(self):
        _, out, _ = run("diff", "x**4", "-n", "2")
        self.assertIn("12 * x ** 2", out)

    def test_integrate(self):
        _, out, _ = run("integrate", "x**2", "0", "3")
        self.assertIn("9", out)

    def test_integrate_over_an_infinite_interval(self):
        _, out, _ = run("integrate", "exp(-x**2)", "-inf", "inf")
        self.assertIn("1.77245", out)

    def test_integrate_with_a_symbolic_bound(self):
        _, out, _ = run("integrate", "sin(x)", "0", "pi")
        self.assertIn("2", out)

    def test_limit(self):
        _, out, _ = run("limit", "sin(x)/x", "0")
        self.assertIn("1", out)

    def test_taylor(self):
        _, out, _ = run("taylor", "exp(x)", "-n", "4")
        self.assertIn("0.5*x^2", out)

    def test_ode(self):
        _, out, _ = run("ode", "y", "--y0", "1", "--t1", "1", "--rows", "4")
        self.assertIn("2.718281828", out)


class TestAlgebraCommands(unittest.TestCase):
    def test_solve(self):
        _, out, _ = run("solve", "x**2 - 4", "-5", "5")
        self.assertIn("-2", out)
        self.assertIn("2", out)

    def test_solve_without_a_root(self):
        code, out, _ = run("solve", "x**2 + 1", "-5", "5")
        self.assertEqual(code, 1)
        self.assertIn("no sign change", out)

    def test_roots(self):
        _, out, _ = run("roots", "-6", "11", "-6", "1")
        for expected in ("x = 1", "x = 2", "x = 3"):
            self.assertIn(expected, out)

    def test_roots_in_descending_order(self):
        _, out, _ = run("roots", "-d", "1", "-6", "11", "-6")
        self.assertIn("x = 1", out)

    def test_poly(self):
        _, out, _ = run("poly", "1", "0", "1", "--at", "2")
        self.assertIn("x^2 + 1", out)
        self.assertIn("5", out)


class TestLinearAlgebraCommands(unittest.TestCase):
    def test_matrix_summary(self):
        _, out, _ = run("matrix", "4,3;6,3")
        self.assertIn("determinant = -6", out)
        self.assertIn("rank      = 2", out)

    def test_matrix_solve(self):
        _, out, _ = run("matrix", "4,3;6,3", "--solve", "10", "12")
        self.assertIn("x1 = 1", out)
        self.assertIn("x2 = 2", out)

    def test_singular_matrix_is_reported(self):
        _, out, _ = run("matrix", "1,2;2,4")
        self.assertIn("singular", out)


class TestNumberTheoryCommands(unittest.TestCase):
    def test_primes(self):
        _, out, _ = run("primes", "30")
        self.assertIn("10 primes up to 30", out)
        self.assertIn("29", out)

    def test_factor(self):
        _, out, _ = run("factor", "360")
        self.assertIn("2^3 * 3^2 * 5", out)

    def test_gcd(self):
        _, out, _ = run("gcd", "240", "46")
        self.assertIn("gcd = 2", out)
        self.assertIn("lcm = 5520", out)

    def test_sequences(self):
        _, out, _ = run("sequence", "fibonacci", "8")
        self.assertEqual(out.strip(), "0 1 1 2 3 5 8 13")
        _, out, _ = run("sequence", "collatz", "6")
        self.assertIn("8 steps", out)

    def test_convert(self):
        _, out, _ = run("convert", "ff", "--from-base", "16", "--to-base", "2")
        self.assertIn("11111111", out)


class TestDataCommands(unittest.TestCase):
    def test_stats(self):
        _, out, _ = run("stats", "2", "4", "4", "4", "5", "5", "7", "9")
        self.assertIn("mean = 5", out)
        self.assertIn("median = 4.5", out)

    def test_regress(self):
        _, out, _ = run("regress", "1,3", "2,5", "3,7")
        self.assertIn("y = 2x + 1", out)

    def test_interpolate(self):
        _, out, _ = run("interpolate", "0,1", "1,3", "2,7", "--at", "1.5")
        self.assertIn("4.75", out)

    def test_triangle(self):
        _, out, _ = run("triangle", "3", "4", "5")
        self.assertIn("area      : 6", out)
        self.assertIn("right     : True", out)

    def test_polygon(self):
        _, out, _ = run("polygon", "0,0", "4,0", "4,3", "0,3")
        self.assertIn("area      : 12", out)


class TestOutputCommands(unittest.TestCase):
    def test_plot(self):
        _, out, _ = run("plot", "sin(x)", "0", "6.28", "--width", "30", "--height", "9")
        self.assertIn("sin(x) on", out)
        self.assertIn("*", out)

    def test_table(self):
        _, out, _ = run("table", "x**2", "0", "2", "--steps", "2")
        self.assertIn("4", out)


class TestErrorHandling(unittest.TestCase):
    def test_parse_error_exits_with_code_two(self):
        code, _, err = run("eval", "2 +")
        self.assertEqual(code, 2)
        self.assertIn("parse error", err)

    def test_unknown_variable(self):
        code, _, err = run("eval", "q + 1")
        self.assertEqual(code, 1)
        self.assertIn("error", err)

    def test_division_by_zero(self):
        code, _, err = run("eval", "1/0")
        self.assertEqual(code, 1)
        self.assertIn("error", err)

    def test_impossible_triangle(self):
        code, _, err = run("triangle", "1", "2", "10")
        self.assertEqual(code, 1)
        self.assertIn("triangle inequality", err)


class TestRepl(unittest.TestCase):
    def test_arithmetic_and_memory(self):
        memory = {}
        self.assertEqual(_evaluate_repl_line("2 + 2", memory), "= 4")
        self.assertEqual(memory["ans"], 4.0)
        self.assertEqual(_evaluate_repl_line("x = 5", memory), "x = 5")
        self.assertEqual(_evaluate_repl_line("x * 2", memory), "= 10")

    def test_derivative_shorthand(self):
        self.assertIn("2 * x", _evaluate_repl_line("d/dx x**2", {}))
        self.assertIn("cos(t)", _evaluate_repl_line("d/dt sin(t)", {}))

    def test_integral_shorthand(self):
        self.assertIn("9", _evaluate_repl_line("int x**2 0 3", {}))

    def test_solve_shorthand(self):
        self.assertIn("2", _evaluate_repl_line("solve x**2 - 4 0 5", {}))
        self.assertIn(
            "no real roots", _evaluate_repl_line("solve x**2 + 4 0 5", {})
        )

    def test_plot_shorthand(self):
        self.assertIn("*", _evaluate_repl_line("plot sin(x) 0 6", {}))


if __name__ == "__main__":
    unittest.main()
