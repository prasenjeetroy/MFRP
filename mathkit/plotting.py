"""Terminal plotting: ASCII graphs, value tables and histograms.

Everything here returns a string, so the output can be printed, logged or
tested without a graphics library.
"""

from __future__ import annotations

import math
from typing import Callable, Iterable, Sequence, Tuple

__all__ = ["plot", "table", "histogram", "bar_chart"]

Function = Callable[[float], float]


def _safe(f: Function, x: float) -> float:
    try:
        value = float(f(x))
    except (ValueError, ZeroDivisionError, OverflowError, ArithmeticError):
        return math.nan
    return value if math.isfinite(value) else math.nan


def plot(
    f: Function,
    a: float,
    b: float,
    width: int = 72,
    height: int = 22,
    label: str = "f(x)",
) -> str:
    """Render ``f`` over [a, b] as an ASCII line graph with labelled axes."""
    if b <= a:
        raise ValueError("b must be greater than a")
    if width < 10 or height < 5:
        raise ValueError("the plot is too small to draw")

    xs = [a + (b - a) * i / (width - 1) for i in range(width)]
    ys = [_safe(f, x) for x in xs]
    finite = [y for y in ys if not math.isnan(y)]
    if not finite:
        return f"{label}: no finite values on [{a:g}, {b:g}]"

    low, high = min(finite), max(finite)
    if high - low < 1e-12:
        low, high = low - 1.0, high + 1.0
    padding = 0.05 * (high - low)
    low, high = low - padding, high + padding

    grid = [[" "] * width for _ in range(height)]

    def row_of(value: float) -> int:
        fraction = (value - low) / (high - low)
        return min(height - 1, max(0, height - 1 - int(round(fraction * (height - 1)))))

    # Axes, drawn first so the curve overwrites them.
    if low <= 0.0 <= high:
        zero_row = row_of(0.0)
        grid[zero_row] = ["-"] * width
    if a <= 0.0 <= b:
        zero_column = int(round((0.0 - a) / (b - a) * (width - 1)))
        for row in range(height):
            grid[row][zero_column] = "|" if grid[row][zero_column] == " " else "+"

    previous_row = None
    for column, y in enumerate(ys):
        if math.isnan(y):
            previous_row = None
            continue
        row = row_of(y)
        # Join steep segments with a vertical run so the curve stays connected.
        if previous_row is not None and abs(row - previous_row) > 1:
            step = 1 if row > previous_row else -1
            for filler in range(previous_row + step, row, step):
                grid[filler][column] = ":"
        grid[row][column] = "*"
        previous_row = row

    y_labels = {0: f"{high:>10.4g}", height - 1: f"{low:>10.4g}"}
    middle = height // 2
    y_labels.setdefault(middle, f"{(low + high) / 2.0:>10.4g}")

    lines = [f"{label} on [{a:g}, {b:g}]"]
    for row in range(height):
        prefix = y_labels.get(row, " " * 10)
        lines.append(f"{prefix} |{''.join(grid[row])}")
    lines.append(" " * 11 + "+" + "-" * width)
    axis = f"{a:g}"
    midpoint = f"{(a + b) / 2.0:g}"
    end = f"{b:g}"
    spacing = width - len(axis) - len(midpoint) - len(end)
    left = max(1, spacing // 2)
    lines.append(" " * 12 + axis + " " * left + midpoint + " " * max(1, spacing - left) + end)
    return "\n".join(lines)


def table(f: Function, a: float, b: float, steps: int = 20, label: str = "f(x)") -> str:
    """A two-column table of ``f`` sampled evenly over [a, b]."""
    if steps < 1:
        raise ValueError("steps must be at least 1")
    lines = [f"{'x':>14}  {label:>18}", f"{'-' * 14}  {'-' * 18}"]
    for i in range(steps + 1):
        x = a + (b - a) * i / steps
        y = _safe(f, x)
        rendered = "undefined" if math.isnan(y) else f"{y:.10g}"
        lines.append(f"{x:>14.6g}  {rendered:>18}")
    return "\n".join(lines)


def histogram(data: Sequence[float], bins: int = 10, width: int = 40) -> str:
    """A horizontal histogram of ``data`` with equal-width bins."""
    values = [float(x) for x in data]
    if not values:
        raise ValueError("no data to plot")
    if bins < 1:
        raise ValueError("bins must be at least 1")

    low, high = min(values), max(values)
    if high == low:
        high = low + 1.0
    counts = [0] * bins
    for value in values:
        index = min(bins - 1, int((value - low) / (high - low) * bins))
        counts[index] += 1

    peak = max(counts) or 1
    lines = []
    for i, count in enumerate(counts):
        left = low + (high - low) * i / bins
        right = low + (high - low) * (i + 1) / bins
        bar = "#" * int(round(count / peak * width))
        lines.append(f"[{left:>9.4g}, {right:>9.4g})  {bar:<{width}} {count}")
    return "\n".join(lines)


def bar_chart(items: Iterable[Tuple[str, float]], width: int = 40) -> str:
    """A labelled bar chart for ``(name, value)`` pairs."""
    pairs = [(str(name), float(value)) for name, value in items]
    if not pairs:
        raise ValueError("no items to plot")
    peak = max(abs(value) for _, value in pairs) or 1.0
    label_width = max(len(name) for name, _ in pairs)
    lines = []
    for name, value in pairs:
        bar = "#" * int(round(abs(value) / peak * width))
        lines.append(f"{name:>{label_width}}  {bar:<{width}} {value:g}")
    return "\n".join(lines)
