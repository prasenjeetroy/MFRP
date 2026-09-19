"""Run the doctests embedded in every mathkit module as part of the suite."""

import doctest
import unittest

import mathkit
from mathkit import (
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

MODULES = [
    mathkit,
    algebra,
    calculus,
    expression,
    geometry,
    interpolation,
    linalg,
    numbertheory,
    plotting,
    statistics,
]


def load_tests(loader, tests, ignore):
    """Hook that unittest calls to collect the doctests in each module."""
    for module in MODULES:
        tests.addTests(doctest.DocTestSuite(module))
    return tests


class TestDoctestCoverage(unittest.TestCase):
    def test_every_module_documents_an_example(self):
        for module in MODULES:
            with self.subTest(module=module.__name__):
                self.assertTrue(
                    doctest.DocTestFinder().find(module),
                    f"{module.__name__} has no doctests",
                )


if __name__ == "__main__":
    unittest.main()
