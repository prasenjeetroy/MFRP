"""Tests for plane and solid geometry."""

import math
import unittest

from mathkit.geometry import (
    circle_area,
    circle_line_intersection,
    cone_volume,
    convex_hull,
    cylinder_volume,
    distance,
    is_right_triangle,
    law_of_cosines,
    law_of_sines,
    line_intersection,
    line_through,
    midpoint_of,
    point_in_polygon,
    point_line_distance,
    polygon_area,
    polygon_centroid,
    polygon_perimeter,
    regular_polygon_area,
    solve_triangle_sas,
    solve_triangle_sss,
    sphere_surface_area,
    sphere_volume,
    triangle_angles,
    triangle_area_sides,
    triangle_area_vertices,
)


class TestPointsAndLines(unittest.TestCase):
    def test_distance_and_midpoint(self):
        self.assertEqual(distance((0, 0), (3, 4)), 5.0)
        self.assertAlmostEqual(distance((0, 0, 0), (1, 2, 2)), 3.0)
        self.assertEqual(midpoint_of((0, 0), (4, 6)), [2.0, 3.0])
        with self.assertRaises(ValueError):
            distance((0, 0), (1, 1, 1))

    def test_line_intersection(self):
        x, y = line_intersection(line_through((0, 0), (1, 1)), line_through((0, 2), (2, 0)))
        self.assertAlmostEqual(x, 1.0)
        self.assertAlmostEqual(y, 1.0)
        with self.assertRaises(ValueError):
            line_intersection(line_through((0, 0), (1, 1)), line_through((0, 1), (1, 2)))

    def test_point_line_distance(self):
        self.assertAlmostEqual(point_line_distance((0, 5), (0, 0), (1, 0)), 5.0)


class TestShapes(unittest.TestCase):
    def test_circle_and_solids(self):
        self.assertAlmostEqual(circle_area(2), 4 * math.pi)
        self.assertAlmostEqual(sphere_volume(3), 36 * math.pi)
        self.assertAlmostEqual(sphere_surface_area(3), 36 * math.pi)
        self.assertAlmostEqual(cylinder_volume(2, 5), 20 * math.pi)
        self.assertAlmostEqual(cone_volume(3, 4), 12 * math.pi)
        with self.assertRaises(ValueError):
            circle_area(-1)

    def test_circle_line_intersection(self):
        points = circle_line_intersection((0, 0), 1, (-2, 0), (2, 0))
        self.assertEqual(len(points), 2)
        self.assertAlmostEqual(points[0][0], -1.0)
        self.assertAlmostEqual(points[1][0], 1.0)
        # A line that misses the circle entirely.
        self.assertEqual(circle_line_intersection((0, 0), 1, (-2, 5), (2, 5)), [])
        # A tangent line touches at exactly one point.
        self.assertEqual(len(circle_line_intersection((0, 0), 1, (-2, 1), (2, 1))), 1)


class TestTriangles(unittest.TestCase):
    def test_area(self):
        self.assertAlmostEqual(triangle_area_sides(3, 4, 5), 6.0)
        self.assertAlmostEqual(triangle_area_vertices((0, 0), (4, 0), (0, 3)), 6.0)

    def test_triangle_inequality_is_enforced(self):
        with self.assertRaises(ValueError):
            triangle_area_sides(1, 2, 10)
        with self.assertRaises(ValueError):
            triangle_area_sides(0, 1, 1)

    def test_angles(self):
        angles = triangle_angles(3, 4, 5)
        self.assertAlmostEqual(sum(angles), 180.0, places=10)
        self.assertAlmostEqual(angles[2], 90.0, places=10)
        self.assertTrue(is_right_triangle(3, 4, 5))
        self.assertFalse(is_right_triangle(3, 4, 6))

    def test_laws(self):
        self.assertAlmostEqual(law_of_cosines(3, 4, 90.0), 5.0, places=12)
        self.assertAlmostEqual(law_of_sines(5, 90.0, 30.0), 2.5, places=12)

    def test_solvers_agree(self):
        by_sides = solve_triangle_sss(3, 4, 5)
        by_angle = solve_triangle_sas(3, 90.0, 4)
        self.assertAlmostEqual(by_sides["area"], by_angle["area"], places=10)
        self.assertAlmostEqual(by_sides["perimeter"], by_angle["perimeter"], places=10)


class TestPolygons(unittest.TestCase):
    def setUp(self):
        self.square = [(0, 0), (4, 0), (4, 3), (0, 3)]

    def test_measurements(self):
        self.assertAlmostEqual(polygon_area(self.square), 12.0)
        self.assertAlmostEqual(polygon_perimeter(self.square), 14.0)
        cx, cy = polygon_centroid(self.square)
        self.assertAlmostEqual(cx, 2.0)
        self.assertAlmostEqual(cy, 1.5)

    def test_winding_order_does_not_change_the_area(self):
        self.assertAlmostEqual(polygon_area(self.square[::-1]), 12.0)

    def test_regular_polygon(self):
        # A regular hexagon of side 1 has area 3*sqrt(3)/2.
        self.assertAlmostEqual(regular_polygon_area(6, 1), 3 * math.sqrt(3) / 2, places=12)
        self.assertAlmostEqual(regular_polygon_area(4, 2), 4.0, places=12)

    def test_point_in_polygon(self):
        self.assertTrue(point_in_polygon((2, 1), self.square))
        self.assertFalse(point_in_polygon((5, 1), self.square))
        self.assertFalse(point_in_polygon((-1, -1), self.square))

    def test_convex_hull(self):
        points = [(0, 0), (1, 1), (2, 0), (1, -1), (1, 0)]
        hull = convex_hull(points)
        self.assertEqual(len(hull), 4)
        self.assertNotIn((1, 0), hull)  # the interior point is dropped
        self.assertAlmostEqual(polygon_area(hull), 2.0)

    def test_too_few_vertices(self):
        with self.assertRaises(ValueError):
            polygon_area([(0, 0), (1, 1)])


if __name__ == "__main__":
    unittest.main()
