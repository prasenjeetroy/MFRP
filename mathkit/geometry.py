"""Plane and solid geometry: shapes, triangles, polygons and hulls.

    >>> round(triangle_area_sides(3, 4, 5), 6)
    6.0
    >>> polygon_area([(0, 0), (4, 0), (4, 3), (0, 3)])
    12.0
"""

from __future__ import annotations

import math
from typing import List, Sequence, Tuple

__all__ = [
    "distance",
    "midpoint_of",
    "slope",
    "line_through",
    "line_intersection",
    "point_line_distance",
    "circle_area",
    "circle_circumference",
    "circle_line_intersection",
    "sphere_volume",
    "sphere_surface_area",
    "cylinder_volume",
    "cone_volume",
    "triangle_area_sides",
    "triangle_area_vertices",
    "triangle_angles",
    "solve_triangle_sss",
    "solve_triangle_sas",
    "law_of_sines",
    "law_of_cosines",
    "is_right_triangle",
    "polygon_area",
    "polygon_perimeter",
    "polygon_centroid",
    "regular_polygon_area",
    "point_in_polygon",
    "convex_hull",
]

Point = Sequence[float]


# --------------------------------------------------------------------------
# Points and lines
# --------------------------------------------------------------------------


def distance(p: Point, q: Point) -> float:
    """Euclidean distance between two points of any dimension."""
    if len(p) != len(q):
        raise ValueError("points must have the same dimension")
    return math.sqrt(math.fsum((a - b) ** 2 for a, b in zip(p, q)))


def midpoint_of(p: Point, q: Point) -> List[float]:
    """The midpoint of the segment pq."""
    if len(p) != len(q):
        raise ValueError("points must have the same dimension")
    return [(a + b) / 2.0 for a, b in zip(p, q)]


def slope(p: Point, q: Point) -> float:
    """Slope of the line through two plane points; vertical lines raise."""
    if q[0] == p[0]:
        raise ValueError("the line is vertical and has no finite slope")
    return (q[1] - p[1]) / (q[0] - p[0])


def line_through(p: Point, q: Point) -> Tuple[float, float, float]:
    """The line through p and q in the form ``(a, b, c)`` with ax + by = c."""
    a = q[1] - p[1]
    b = p[0] - q[0]
    if a == 0 and b == 0:
        raise ValueError("the two points coincide")
    return a, b, a * p[0] + b * p[1]


def line_intersection(
    line1: Tuple[float, float, float], line2: Tuple[float, float, float]
) -> Tuple[float, float]:
    """Intersection point of two lines given as ``(a, b, c)`` with ax + by = c."""
    a1, b1, c1 = line1
    a2, b2, c2 = line2
    determinant = a1 * b2 - a2 * b1
    if abs(determinant) < 1e-14:
        raise ValueError("the lines are parallel or coincident")
    return (c1 * b2 - c2 * b1) / determinant, (a1 * c2 - a2 * c1) / determinant


def point_line_distance(point: Point, p: Point, q: Point) -> float:
    """Perpendicular distance from ``point`` to the line through p and q."""
    a, b, c = line_through(p, q)
    return abs(a * point[0] + b * point[1] - c) / math.hypot(a, b)


# --------------------------------------------------------------------------
# Circles and solids
# --------------------------------------------------------------------------


def circle_area(radius: float) -> float:
    """Area of a circle."""
    if radius < 0:
        raise ValueError("radius must be non-negative")
    return math.pi * radius * radius


def circle_circumference(radius: float) -> float:
    """Circumference of a circle."""
    if radius < 0:
        raise ValueError("radius must be non-negative")
    return 2.0 * math.pi * radius


def circle_line_intersection(
    centre: Point, radius: float, p: Point, q: Point
) -> List[Tuple[float, float]]:
    """Points where the line pq meets a circle — zero, one or two of them."""
    dx, dy = q[0] - p[0], q[1] - p[1]
    fx, fy = p[0] - centre[0], p[1] - centre[1]
    a = dx * dx + dy * dy
    if a == 0:
        raise ValueError("the two points defining the line coincide")
    b = 2.0 * (fx * dx + fy * dy)
    c = fx * fx + fy * fy - radius * radius
    discriminant = b * b - 4.0 * a * c
    if discriminant < 0:
        return []
    root = math.sqrt(discriminant)
    parameters = {(-b - root) / (2.0 * a), (-b + root) / (2.0 * a)}
    return sorted((p[0] + t * dx, p[1] + t * dy) for t in parameters)


def sphere_volume(radius: float) -> float:
    """Volume of a sphere."""
    if radius < 0:
        raise ValueError("radius must be non-negative")
    return 4.0 / 3.0 * math.pi * radius ** 3


def sphere_surface_area(radius: float) -> float:
    """Surface area of a sphere."""
    if radius < 0:
        raise ValueError("radius must be non-negative")
    return 4.0 * math.pi * radius * radius


def cylinder_volume(radius: float, height: float) -> float:
    """Volume of a right circular cylinder."""
    if radius < 0 or height < 0:
        raise ValueError("dimensions must be non-negative")
    return math.pi * radius * radius * height


def cone_volume(radius: float, height: float) -> float:
    """Volume of a right circular cone."""
    if radius < 0 or height < 0:
        raise ValueError("dimensions must be non-negative")
    return math.pi * radius * radius * height / 3.0


# --------------------------------------------------------------------------
# Triangles
# --------------------------------------------------------------------------


def _check_triangle(a: float, b: float, c: float) -> None:
    if min(a, b, c) <= 0:
        raise ValueError("side lengths must be positive")
    if a + b <= c or a + c <= b or b + c <= a:
        raise ValueError(f"sides {a}, {b}, {c} violate the triangle inequality")


def triangle_area_sides(a: float, b: float, c: float) -> float:
    """Area from three side lengths, by Heron's formula."""
    _check_triangle(a, b, c)
    s = 0.5 * (a + b + c)
    return math.sqrt(max(0.0, s * (s - a) * (s - b) * (s - c)))


def triangle_area_vertices(p: Point, q: Point, r: Point) -> float:
    """Area of the triangle with the given plane vertices."""
    return abs(
        (q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1])
    ) / 2.0


def triangle_angles(a: float, b: float, c: float, degrees: bool = True) -> Tuple[float, float, float]:
    """The three angles opposite sides a, b and c."""
    _check_triangle(a, b, c)

    def angle(opposite: float, x: float, y: float) -> float:
        cosine = max(-1.0, min(1.0, (x * x + y * y - opposite * opposite) / (2.0 * x * y)))
        value = math.acos(cosine)
        return math.degrees(value) if degrees else value

    return angle(a, b, c), angle(b, a, c), angle(c, a, b)


def law_of_cosines(b: float, c: float, angle_a: float, degrees: bool = True) -> float:
    """The side opposite ``angle_a`` in a triangle with the other sides b, c."""
    if min(b, c) <= 0:
        raise ValueError("side lengths must be positive")
    radians = math.radians(angle_a) if degrees else angle_a
    return math.sqrt(b * b + c * c - 2.0 * b * c * math.cos(radians))


def law_of_sines(a: float, angle_a: float, angle_b: float, degrees: bool = True) -> float:
    """The side opposite ``angle_b``, given side ``a`` opposite ``angle_a``."""
    ra = math.radians(angle_a) if degrees else angle_a
    rb = math.radians(angle_b) if degrees else angle_b
    if math.sin(ra) == 0:
        raise ValueError("angle_a cannot be a multiple of 180 degrees")
    return a * math.sin(rb) / math.sin(ra)


def solve_triangle_sss(a: float, b: float, c: float) -> dict:
    """Fully solve a triangle from three sides."""
    angles = triangle_angles(a, b, c)
    return {
        "sides": (a, b, c),
        "angles": angles,
        "area": triangle_area_sides(a, b, c),
        "perimeter": a + b + c,
    }


def solve_triangle_sas(b: float, angle_a: float, c: float, degrees: bool = True) -> dict:
    """Fully solve a triangle from two sides and the angle between them."""
    a = law_of_cosines(b, c, angle_a, degrees)
    return solve_triangle_sss(a, b, c)


def is_right_triangle(a: float, b: float, c: float, tolerance: float = 1e-9) -> bool:
    """Whether the three side lengths satisfy the Pythagorean theorem."""
    x, y, z = sorted((a, b, c))
    return abs(x * x + y * y - z * z) <= tolerance * max(1.0, z * z)


# --------------------------------------------------------------------------
# Polygons
# --------------------------------------------------------------------------


def polygon_area(vertices: Sequence[Point]) -> float:
    """Area of a simple polygon by the shoelace formula."""
    if len(vertices) < 3:
        raise ValueError("a polygon needs at least three vertices")
    total = 0.0
    for i, (x1, y1) in enumerate(vertices):
        x2, y2 = vertices[(i + 1) % len(vertices)]
        total += x1 * y2 - x2 * y1
    return abs(total) / 2.0


def polygon_perimeter(vertices: Sequence[Point]) -> float:
    """Total edge length of a closed polygon."""
    if len(vertices) < 2:
        raise ValueError("a polygon needs at least two vertices")
    return math.fsum(
        distance(vertices[i], vertices[(i + 1) % len(vertices)])
        for i in range(len(vertices))
    )


def polygon_centroid(vertices: Sequence[Point]) -> Tuple[float, float]:
    """Centroid (centre of mass) of a simple polygon."""
    if len(vertices) < 3:
        raise ValueError("a polygon needs at least three vertices")
    cx = cy = signed_area = 0.0
    for i, (x1, y1) in enumerate(vertices):
        x2, y2 = vertices[(i + 1) % len(vertices)]
        cross = x1 * y2 - x2 * y1
        signed_area += cross
        cx += (x1 + x2) * cross
        cy += (y1 + y2) * cross
    if abs(signed_area) < 1e-14:
        raise ValueError("degenerate polygon has no centroid")
    signed_area *= 0.5
    return cx / (6.0 * signed_area), cy / (6.0 * signed_area)


def regular_polygon_area(sides: int, side_length: float) -> float:
    """Area of a regular polygon with ``sides`` edges of the given length."""
    if sides < 3:
        raise ValueError("a polygon needs at least three sides")
    if side_length <= 0:
        raise ValueError("side length must be positive")
    return sides * side_length ** 2 / (4.0 * math.tan(math.pi / sides))


def point_in_polygon(point: Point, vertices: Sequence[Point]) -> bool:
    """Whether ``point`` lies inside a polygon, by the ray casting rule."""
    if len(vertices) < 3:
        raise ValueError("a polygon needs at least three vertices")
    x, y = point[0], point[1]
    inside = False
    for i, (x1, y1) in enumerate(vertices):
        x2, y2 = vertices[(i - 1) % len(vertices)]
        if (y1 > y) != (y2 > y):
            crossing = (x2 - x1) * (y - y1) / (y2 - y1) + x1
            if x < crossing:
                inside = not inside
    return inside


def convex_hull(points: Sequence[Point]) -> List[Tuple[float, float]]:
    """Convex hull of a point set, counter-clockwise (Andrew's monotone chain)."""
    unique = sorted({(float(p[0]), float(p[1])) for p in points})
    if len(unique) < 3:
        return unique

    def turn(o, a, b) -> float:
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower: List[Tuple[float, float]] = []
    for p in unique:
        while len(lower) >= 2 and turn(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)

    upper: List[Tuple[float, float]] = []
    for p in reversed(unique):
        while len(upper) >= 2 and turn(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)

    return lower[:-1] + upper[:-1]
