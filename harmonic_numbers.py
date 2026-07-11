"""Compute harmonic numbers H(n) = 1 + 1/2 + 1/3 + ... + 1/n."""

import argparse
from fractions import Fraction


def harmonic_number(n: int) -> Fraction:
    if n < 1:
        raise ValueError("n must be a positive integer")
    return sum(Fraction(1, k) for k in range(1, n + 1))


def harmonic_sequence(n: int):
    total = Fraction(0)
    for k in range(1, n + 1):
        total += Fraction(1, k)
        yield k, total


def main():
    parser = argparse.ArgumentParser(description="Compute harmonic numbers.")
    parser.add_argument("n", type=int, help="Compute H(n)")
    parser.add_argument(
        "--all", action="store_true", help="Print H(1) through H(n)"
    )
    parser.add_argument(
        "--float", action="store_true", help="Print as a decimal approximation"
    )
    args = parser.parse_args()

    def fmt(value: Fraction) -> str:
        return str(float(value)) if args.float else str(value)

    if args.all:
        for k, value in harmonic_sequence(args.n):
            print(f"H({k}) = {fmt(value)}")
    else:
        print(f"H({args.n}) = {fmt(harmonic_number(args.n))}")


if __name__ == "__main__":
    main()
