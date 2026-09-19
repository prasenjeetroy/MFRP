"""Tests for the terminal plotting helpers."""

import math
import unittest

from mathkit.plotting import bar_chart, histogram, plot, table


class TestPlot(unittest.TestCase):
    def test_shape_of_the_output(self):
        rendered = plot(math.sin, 0.0, 2 * math.pi, width=40, height=11,
                        label="sin(x)")
        lines = rendered.splitlines()
        # A title line, `height` plot rows, an axis rule and an axis label.
        self.assertEqual(len(lines), 11 + 3)
        self.assertIn("sin(x)", lines[0])
        self.assertIn("*", rendered)

    def test_default_label(self):
        self.assertIn("f(x)", plot(math.sin, 0.0, 1.0, width=20, height=7))

    def test_constant_function_does_not_divide_by_zero(self):
        rendered = plot(lambda x: 2.0, 0.0, 1.0, width=20, height=7)
        self.assertIn("*", rendered)

    def test_undefined_points_are_skipped(self):
        rendered = plot(lambda x: 1.0 / x, -1.0, 1.0, width=30, height=9)
        self.assertIn("*", rendered)

    def test_nothing_finite_to_draw(self):
        rendered = plot(lambda x: math.nan, 0.0, 1.0, width=20, height=7)
        self.assertIn("no finite values", rendered)

    def test_invalid_arguments(self):
        with self.assertRaises(ValueError):
            plot(math.sin, 1.0, 0.0)
        with self.assertRaises(ValueError):
            plot(math.sin, 0.0, 1.0, width=2)


class TestTable(unittest.TestCase):
    def test_row_count_and_endpoints(self):
        rendered = table(lambda x: x * x, 0.0, 2.0, steps=4)
        lines = rendered.splitlines()
        self.assertEqual(len(lines), 4 + 3)  # header, rule, and steps + 1 rows
        self.assertIn("4", lines[-1])

    def test_undefined_values_are_labelled(self):
        self.assertIn("undefined", table(lambda x: 1.0 / x, 0.0, 1.0, steps=2))


class TestCharts(unittest.TestCase):
    def test_histogram_counts_every_value(self):
        data = [1, 2, 2, 3, 3, 3, 4, 4, 5, 9]
        rendered = histogram(data, bins=5)
        self.assertEqual(len(rendered.splitlines()), 5)
        counts = [int(line.split()[-1]) for line in rendered.splitlines()]
        self.assertEqual(sum(counts), len(data))

    def test_histogram_of_constant_data(self):
        self.assertEqual(len(histogram([3, 3, 3], bins=2).splitlines()), 2)

    def test_bar_chart(self):
        rendered = bar_chart([("alpha", 3), ("beta", 7)])
        self.assertIn("alpha", rendered)
        self.assertIn("#", rendered)

    def test_empty_input(self):
        with self.assertRaises(ValueError):
            histogram([])
        with self.assertRaises(ValueError):
            bar_chart([])


if __name__ == "__main__":
    unittest.main()
