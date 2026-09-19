"""Matrices and vectors: solving systems, determinants, decompositions.

    >>> A = Matrix([[4, 3], [6, 3]])
    >>> A.determinant()
    -6.0
    >>> A.solve([10, 12])
    [1.0, 2.0]
"""

from __future__ import annotations

import math
from typing import Iterable, List, Sequence, Tuple

__all__ = [
    "Matrix",
    "SingularMatrixError",
    "dot",
    "cross",
    "norm",
    "normalize",
    "angle_between",
    "projection",
    "identity",
    "zeros",
]

Vector = Sequence[float]


class SingularMatrixError(ValueError):
    """Raised when a matrix has no inverse or a system has no unique solution."""


# --------------------------------------------------------------------------
# Vector helpers
# --------------------------------------------------------------------------


def dot(a: Vector, b: Vector) -> float:
    """Dot product of two vectors of equal length."""
    if len(a) != len(b):
        raise ValueError("vectors must have the same length")
    return float(sum(x * y for x, y in zip(a, b)))


def cross(a: Vector, b: Vector) -> List[float]:
    """Cross product of two 3-dimensional vectors."""
    if len(a) != 3 or len(b) != 3:
        raise ValueError("cross product is defined for 3-dimensional vectors")
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]


def norm(a: Vector, p: float = 2.0) -> float:
    """The p-norm of a vector; ``p=math.inf`` gives the maximum norm."""
    if math.isinf(p):
        return max((abs(x) for x in a), default=0.0)
    if p < 1:
        raise ValueError("p must be at least 1")
    return float(sum(abs(x) ** p for x in a) ** (1.0 / p))


def normalize(a: Vector) -> List[float]:
    """Return the unit vector pointing in the same direction as ``a``."""
    length = norm(a)
    if length == 0:
        raise ValueError("cannot normalize the zero vector")
    return [x / length for x in a]


def angle_between(a: Vector, b: Vector, degrees: bool = False) -> float:
    """Angle between two vectors, in radians unless ``degrees`` is set."""
    denominator = norm(a) * norm(b)
    if denominator == 0:
        raise ValueError("angle undefined for the zero vector")
    cosine = max(-1.0, min(1.0, dot(a, b) / denominator))
    angle = math.acos(cosine)
    return math.degrees(angle) if degrees else angle


def projection(a: Vector, b: Vector) -> List[float]:
    """Projection of vector ``a`` onto vector ``b``."""
    scale = dot(a, b) / dot(b, b)
    return [scale * x for x in b]


# --------------------------------------------------------------------------
# Matrix
# --------------------------------------------------------------------------


class Matrix:
    """A dense matrix of floats, stored as a list of rows."""

    __slots__ = ("rows", "shape")

    def __init__(self, rows: Iterable[Iterable[float]]) -> None:
        data = [[float(value) for value in row] for row in rows]
        if not data or not data[0]:
            raise ValueError("matrix must have at least one row and column")
        width = len(data[0])
        if any(len(row) != width for row in data):
            raise ValueError("all rows must have the same length")
        self.rows = data
        self.shape: Tuple[int, int] = (len(data), width)

    # -- construction ------------------------------------------------------

    @classmethod
    def identity(cls, n: int) -> "Matrix":
        """The n x n identity matrix."""
        return cls([[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)])

    @classmethod
    def zeros(cls, rows: int, columns: int) -> "Matrix":
        """A rows x columns matrix of zeros."""
        return cls([[0.0] * columns for _ in range(rows)])

    @classmethod
    def from_columns(cls, columns: Sequence[Vector]) -> "Matrix":
        """Build a matrix whose columns are the given vectors."""
        return cls(list(zip(*columns)))

    # -- basic protocol ----------------------------------------------------

    def __getitem__(self, index):
        return self.rows[index]

    def __len__(self) -> int:
        return self.shape[0]

    def __iter__(self):
        return iter(self.rows)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Matrix):
            return NotImplemented
        return self.shape == other.shape and all(
            math.isclose(a, b, abs_tol=1e-12)
            for row_a, row_b in zip(self.rows, other.rows)
            for a, b in zip(row_a, row_b)
        )

    def __repr__(self) -> str:
        return f"Matrix({self.rows!r})"

    def __str__(self) -> str:
        cells = [[f"{value:g}" for value in row] for row in self.rows]
        widths = [max(len(row[j]) for row in cells) for j in range(self.shape[1])]
        lines = [
            "[ " + "  ".join(cell.rjust(width) for cell, width in zip(row, widths)) + " ]"
            for row in cells
        ]
        return "\n".join(lines)

    # -- arithmetic --------------------------------------------------------

    def __add__(self, other: "Matrix") -> "Matrix":
        if self.shape != other.shape:
            raise ValueError("shapes do not match for addition")
        return Matrix(
            [[a + b for a, b in zip(ra, rb)] for ra, rb in zip(self.rows, other.rows)]
        )

    def __sub__(self, other: "Matrix") -> "Matrix":
        if self.shape != other.shape:
            raise ValueError("shapes do not match for subtraction")
        return Matrix(
            [[a - b for a, b in zip(ra, rb)] for ra, rb in zip(self.rows, other.rows)]
        )

    def __mul__(self, scalar: float) -> "Matrix":
        return Matrix([[value * scalar for value in row] for row in self.rows])

    __rmul__ = __mul__

    def __neg__(self) -> "Matrix":
        return self * -1.0

    def __matmul__(self, other: "Matrix") -> "Matrix":
        return self.multiply(other)

    def multiply(self, other: "Matrix") -> "Matrix":
        """Matrix product ``self @ other``."""
        if self.shape[1] != other.shape[0]:
            raise ValueError(
                f"cannot multiply {self.shape} by {other.shape}"
            )
        other_columns = other.transpose().rows
        return Matrix(
            [[dot(row, column) for column in other_columns] for row in self.rows]
        )

    def apply(self, vector: Vector) -> List[float]:
        """Multiply this matrix by a column vector."""
        if len(vector) != self.shape[1]:
            raise ValueError("vector length must match the number of columns")
        return [dot(row, vector) for row in self.rows]

    def power(self, exponent: int) -> "Matrix":
        """Raise a square matrix to a non-negative integer power."""
        n, m = self.shape
        if n != m:
            raise ValueError("matrix power requires a square matrix")
        if exponent < 0:
            return self.inverse().power(-exponent)
        result = Matrix.identity(n)
        base = self
        while exponent:
            if exponent & 1:
                result = result.multiply(base)
            base = base.multiply(base)
            exponent >>= 1
        return result

    # -- structure ---------------------------------------------------------

    def transpose(self) -> "Matrix":
        """The transpose of this matrix."""
        return Matrix([list(column) for column in zip(*self.rows)])

    def trace(self) -> float:
        """Sum of the diagonal entries of a square matrix."""
        n, m = self.shape
        if n != m:
            raise ValueError("trace requires a square matrix")
        return float(sum(self.rows[i][i] for i in range(n)))

    def is_symmetric(self, tolerance: float = 1e-10) -> bool:
        """Whether the matrix equals its own transpose."""
        n, m = self.shape
        if n != m:
            return False
        return all(
            abs(self.rows[i][j] - self.rows[j][i]) <= tolerance
            for i in range(n)
            for j in range(i + 1, n)
        )

    def minor(self, row: int, column: int) -> "Matrix":
        """The submatrix with ``row`` and ``column`` removed."""
        return Matrix(
            [
                [value for j, value in enumerate(r) if j != column]
                for i, r in enumerate(self.rows)
                if i != row
            ]
        )

    # -- decompositions and solvers ---------------------------------------

    def lu_decomposition(self) -> Tuple["Matrix", "Matrix", List[int], int]:
        """LU decomposition with partial pivoting.

        Returns ``(L, U, permutation, sign)`` such that ``P @ self == L @ U``,
        where ``permutation[i]`` is the original index of row i.
        """
        n, m = self.shape
        if n != m:
            raise ValueError("LU decomposition requires a square matrix")
        u = [row[:] for row in self.rows]
        l = [[0.0] * n for _ in range(n)]
        permutation = list(range(n))
        sign = 1

        for k in range(n):
            pivot_row = max(range(k, n), key=lambda i: abs(u[i][k]))
            if abs(u[pivot_row][k]) < 1e-14:
                raise SingularMatrixError("matrix is singular to working precision")
            if pivot_row != k:
                u[k], u[pivot_row] = u[pivot_row], u[k]
                l[k], l[pivot_row] = l[pivot_row], l[k]
                permutation[k], permutation[pivot_row] = (
                    permutation[pivot_row],
                    permutation[k],
                )
                sign = -sign
            l[k][k] = 1.0
            for i in range(k + 1, n):
                factor = u[i][k] / u[k][k]
                l[i][k] = factor
                for j in range(k, n):
                    u[i][j] -= factor * u[k][j]
        return Matrix(l), Matrix(u), permutation, sign

    def determinant(self) -> float:
        """Determinant via LU decomposition (O(n^3))."""
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

    def solve(self, b: Vector) -> List[float]:
        """Solve ``self @ x = b`` by Gaussian elimination with partial pivoting."""
        n, m = self.shape
        if n != m:
            raise ValueError("solve requires a square matrix; use least_squares")
        if len(b) != n:
            raise ValueError("right-hand side length must match the matrix size")

        augmented = [row[:] + [float(b[i])] for i, row in enumerate(self.rows)]
        for k in range(n):
            pivot_row = max(range(k, n), key=lambda i: abs(augmented[i][k]))
            if abs(augmented[pivot_row][k]) < 1e-14:
                raise SingularMatrixError("system has no unique solution")
            augmented[k], augmented[pivot_row] = augmented[pivot_row], augmented[k]
            pivot = augmented[k][k]
            for i in range(k + 1, n):
                factor = augmented[i][k] / pivot
                if factor:
                    for j in range(k, n + 1):
                        augmented[i][j] -= factor * augmented[k][j]

        x = [0.0] * n
        for i in range(n - 1, -1, -1):
            total = augmented[i][n] - sum(augmented[i][j] * x[j] for j in range(i + 1, n))
            x[i] = total / augmented[i][i]
        return x

    def inverse(self) -> "Matrix":
        """The inverse of a square matrix."""
        n, m = self.shape
        if n != m:
            raise ValueError("inverse requires a square matrix")
        columns = [self.solve(
            [1.0 if i == j else 0.0 for i in range(n)]
        ) for j in range(n)]
        return Matrix.from_columns(columns)

    def rank(self, tolerance: float = 1e-10) -> int:
        """Rank computed by Gaussian elimination to row echelon form."""
        rows = [row[:] for row in self.rows]
        n, m = self.shape
        rank = 0
        pivot_row = 0
        for column in range(m):
            if pivot_row >= n:
                break
            best = max(range(pivot_row, n), key=lambda i: abs(rows[i][column]))
            if abs(rows[best][column]) <= tolerance:
                continue
            rows[pivot_row], rows[best] = rows[best], rows[pivot_row]
            pivot = rows[pivot_row][column]
            for i in range(pivot_row + 1, n):
                factor = rows[i][column] / pivot
                for j in range(column, m):
                    rows[i][j] -= factor * rows[pivot_row][j]
            pivot_row += 1
            rank += 1
        return rank

    def row_echelon(self, reduced: bool = True, tolerance: float = 1e-12) -> "Matrix":
        """Row echelon form; ``reduced`` gives the reduced (RREF) form."""
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
            rows[pivot_row] = [value / pivot for value in rows[pivot_row]]
            targets = range(n) if reduced else range(pivot_row + 1, n)
            for i in targets:
                if i == pivot_row:
                    continue
                factor = rows[i][column]
                if factor:
                    for j in range(m):
                        rows[i][j] -= factor * rows[pivot_row][j]
            pivot_row += 1
        return Matrix([[0.0 if value == 0 else value for value in row] for row in rows])

    def qr_decomposition(self) -> Tuple["Matrix", "Matrix"]:
        """QR decomposition by the modified Gram-Schmidt process."""
        n, m = self.shape
        columns = [list(column) for column in zip(*self.rows)]
        q_columns: List[List[float]] = []
        r = [[0.0] * m for _ in range(m)]
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

    def eigenvalues(self, iterations: int = 500, tolerance: float = 1e-12) -> List[float]:
        """Real eigenvalues of a square matrix via the unshifted QR algorithm.

        Complex eigenvalues are not returned; use this on symmetric or
        otherwise real-spectrum matrices.
        """
        n, m = self.shape
        if n != m:
            raise ValueError("eigenvalues require a square matrix")
        a = Matrix([row[:] for row in self.rows])
        for _ in range(iterations):
            q, r = a.qr_decomposition()
            a = r.multiply(q)
            off_diagonal = sum(
                abs(a.rows[i][j]) for i in range(n) for j in range(i) 
            )
            if off_diagonal < tolerance:
                break
        return sorted((a.rows[i][i] for i in range(n)), reverse=True)

    def eigenvector(self, eigenvalue: float, iterations: int = 100) -> List[float]:
        """Eigenvector for ``eigenvalue`` found by inverse iteration."""
        n, _ = self.shape
        shifted = Matrix(
            [
                [
                    value - (eigenvalue + 1e-8 if i == j else 0.0)
                    for j, value in enumerate(row)
                ]
                for i, row in enumerate(self.rows)
            ]
        )
        v = [1.0 / math.sqrt(n)] * n
        for _ in range(iterations):
            try:
                w = shifted.solve(v)
            except SingularMatrixError:
                break
            length = norm(w)
            if length == 0:
                break
            new_v = [x / length for x in w]
            if norm([a - b for a, b in zip(new_v, v)]) < 1e-12:
                v = new_v
                break
            v = new_v
        # Fix the sign so the largest-magnitude component is positive.
        pivot = max(v, key=abs)
        return [x if pivot >= 0 else -x for x in v]

    def least_squares(self, b: Vector) -> List[float]:
        """Least-squares solution of an overdetermined system ``self @ x ~ b``."""
        at = self.transpose()
        return at.multiply(self).solve(at.apply(b))


def identity(n: int) -> Matrix:
    """Convenience wrapper for :meth:`Matrix.identity`."""
    return Matrix.identity(n)


def zeros(rows: int, columns: int) -> Matrix:
    """Convenience wrapper for :meth:`Matrix.zeros`."""
    return Matrix.zeros(rows, columns)
