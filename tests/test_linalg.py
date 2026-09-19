"""Tests for matrices, vectors and linear solvers."""

import math
import unittest

from mathkit.linalg import (
    Matrix,
    SingularMatrixError,
    angle_between,
    cross,
    dot,
    norm,
    normalize,
    projection,
)


class TestVectors(unittest.TestCase):
    def test_dot_and_cross(self):
        self.assertEqual(dot([1, 2, 3], [4, 5, 6]), 32.0)
        self.assertEqual(cross([1, 0, 0], [0, 1, 0]), [0, 0, 1])
        with self.assertRaises(ValueError):
            dot([1, 2], [1, 2, 3])
        with self.assertRaises(ValueError):
            cross([1, 2], [1, 2])

    def test_norms(self):
        self.assertEqual(norm([3, 4]), 5.0)
        self.assertEqual(norm([3, -4], 1), 7.0)
        self.assertEqual(norm([3, -4], math.inf), 4.0)
        self.assertAlmostEqual(norm(normalize([3, 4])), 1.0)
        with self.assertRaises(ValueError):
            normalize([0, 0])

    def test_angles_and_projection(self):
        self.assertAlmostEqual(angle_between([1, 0], [0, 1], degrees=True), 90.0)
        self.assertAlmostEqual(angle_between([1, 0], [1, 0]), 0.0)
        self.assertEqual(projection([3, 4], [1, 0]), [3.0, 0.0])


class TestMatrixBasics(unittest.TestCase):
    def setUp(self):
        self.a = Matrix([[4, 3], [6, 3]])

    def test_shape_and_construction(self):
        self.assertEqual(self.a.shape, (2, 2))
        self.assertEqual(Matrix.identity(3).shape, (3, 3))
        self.assertEqual(Matrix.zeros(2, 3).shape, (2, 3))
        with self.assertRaises(ValueError):
            Matrix([[1, 2], [3]])

    def test_arithmetic(self):
        b = Matrix([[1, 0], [0, 1]])
        self.assertEqual(self.a + b, Matrix([[5, 3], [6, 4]]))
        self.assertEqual(self.a - b, Matrix([[3, 3], [6, 2]]))
        self.assertEqual(self.a * 2, Matrix([[8, 6], [12, 6]]))
        self.assertEqual(self.a.multiply(b), self.a)
        self.assertEqual(self.a @ b, self.a)

    def test_multiplication_shape_check(self):
        with self.assertRaises(ValueError):
            Matrix([[1, 2, 3]]).multiply(Matrix([[1, 2]]))

    def test_transpose_and_trace(self):
        self.assertEqual(self.a.transpose(), Matrix([[4, 6], [3, 3]]))
        self.assertEqual(self.a.trace(), 7.0)
        self.assertTrue(Matrix([[1, 2], [2, 1]]).is_symmetric())
        self.assertFalse(self.a.is_symmetric())

    def test_power_reproduces_fibonacci(self):
        # [[1,1],[1,0]]^n has F(n+1), F(n) on its top row.
        result = Matrix([[1, 1], [1, 0]]).power(10)
        self.assertEqual(result, Matrix([[89, 55], [55, 34]]))
        self.assertEqual(Matrix([[2, 0], [0, 2]]).power(0), Matrix.identity(2))


class TestMatrixSolvers(unittest.TestCase):
    def test_determinant(self):
        self.assertAlmostEqual(Matrix([[4, 3], [6, 3]]).determinant(), -6.0)
        self.assertAlmostEqual(Matrix([[5]]).determinant(), 5.0)
        self.assertAlmostEqual(Matrix([[1, 2], [2, 4]]).determinant(), 0.0)
        self.assertAlmostEqual(
            Matrix([[6, 1, 1], [4, -2, 5], [2, 8, 7]]).determinant(), -306.0, places=9
        )

    def test_solve(self):
        solution = Matrix([[4, 3], [6, 3]]).solve([10, 12])
        self.assertAlmostEqual(solution[0], 1.0, places=12)
        self.assertAlmostEqual(solution[1], 2.0, places=12)

    def test_solve_rejects_singular_systems(self):
        with self.assertRaises(SingularMatrixError):
            Matrix([[1, 2], [2, 4]]).solve([1, 2])

    def test_inverse_round_trip(self):
        a = Matrix([[4, 7, 2], [3, 6, 1], [2, 5, 3]])
        self.assertEqual(a.multiply(a.inverse()), Matrix.identity(3))

    def test_lu_decomposition_reconstructs_the_matrix(self):
        a = Matrix([[4, 3, 1], [6, 3, 2], [2, 8, 7]])
        l, u, permutation, _ = a.lu_decomposition()
        permuted = Matrix([a.rows[index] for index in permutation])
        self.assertEqual(l.multiply(u), permuted)

    def test_qr_decomposition_reconstructs_the_matrix(self):
        a = Matrix([[1, 1], [1, 0], [0, 1]])
        q, r = a.qr_decomposition()
        self.assertEqual(q.multiply(r), a)

    def test_rank_and_echelon(self):
        self.assertEqual(Matrix([[1, 2, 3], [2, 4, 6], [1, 0, 1]]).rank(), 2)
        self.assertEqual(Matrix.identity(4).rank(), 4)
        self.assertEqual(
            Matrix([[1, 2, 3], [4, 5, 6], [7, 8, 10]]).row_echelon(), Matrix.identity(3)
        )

    def test_eigenvalues_of_a_symmetric_matrix(self):
        values = Matrix([[2, 1], [1, 2]]).eigenvalues()
        self.assertAlmostEqual(values[0], 3.0, places=8)
        self.assertAlmostEqual(values[1], 1.0, places=8)

    def test_eigenvalues_match_trace_and_determinant(self):
        a = Matrix([[4, 12, -16], [12, 37, -43], [-16, -43, 98]])
        values = a.eigenvalues()
        self.assertAlmostEqual(sum(values), a.trace(), places=6)
        product = values[0] * values[1] * values[2]
        self.assertAlmostEqual(product, a.determinant(), places=4)

    def test_eigenvector_satisfies_its_definition(self):
        a = Matrix([[2, 1], [1, 2]])
        vector = a.eigenvector(3.0)
        image = a.apply(vector)
        for got, want in zip(image, [3.0 * v for v in vector]):
            self.assertAlmostEqual(got, want, places=6)

    def test_least_squares(self):
        # Points on the line y = x fit exactly.
        solution = Matrix([[1, 1], [1, 2], [1, 3]]).least_squares([1, 2, 3])
        self.assertAlmostEqual(solution[0], 0.0, places=9)
        self.assertAlmostEqual(solution[1], 1.0, places=9)


if __name__ == "__main__":
    unittest.main()
