# MFRP

MyFirstRealSFDCProject

## mathkit — a Python mathematics calculator

`mathkit` is a mathematics toolkit and calculator written in pure Python. It
covers calculus (symbolic differentiation, numerical integration, limits,
series and differential equations), algebra, linear algebra, number theory,
statistics, geometry and interpolation — usable both as a library and from
the command line.

It has **no third-party dependencies**: everything is built on the standard
library, including the expression parser and the computer algebra rules.

### Quick start

```bash
python3 -m mathkit eval "2 + 3 * 4 ** 2"          # 50
python3 -m mathkit diff "x**3 * exp(x)" --at 1    # symbolic derivative
python3 -m mathkit integrate "exp(-x**2)" -inf inf
python3 -m mathkit repl                           # interactive calculator
python3 -m mathkit --help                         # every command
```

As a library:

```python
import mathkit

mathkit.evaluate("sin(pi/2) + log(8, 2)")           # 4.0
mathkit.differentiate("x**2 * sin(x)", "x")         # 2*x*sin(x) + x**2*cos(x)
mathkit.integrate(lambda x: x ** 2, 0, 3)           # 9.0
mathkit.Matrix([[4, 3], [6, 3]]).solve([10, 12])    # [1.0, 2.0]
mathkit.Polynomial([-6, 11, -6, 1]).real_roots()    # [1.0, 2.0, 3.0]
mathkit.factorize(360)                              # {2: 3, 3: 2, 5: 1}
```

### What is included

| Module | Contents |
| --- | --- |
| `mathkit.expression` | tokenizer, recursive-descent parser, evaluator, simplifier and **symbolic differentiation** (chain, product, quotient and power rules, plus every standard function) |
| `mathkit.calculus` | finite-difference derivatives to any order, gradients, Jacobians and Hessians; trapezoid, midpoint, Simpson, Romberg, Gauss-Legendre and adaptive quadrature; improper and double integrals; limits; Taylor series; arc length and surfaces of revolution; Euler and Runge-Kutta ODE solvers |
| `mathkit.algebra` | a full `Polynomial` type (arithmetic, long division, GCD, composition, exact calculus, Lagrange interpolation, complex roots by Durand-Kerner); bisection, Newton, secant, Brent and fixed-point root finders; closed-form quadratic and cubic formulas; golden-section minimization |
| `mathkit.linalg` | a `Matrix` type with LU and QR decompositions, determinants, inverses, Gaussian elimination, rank, row echelon form, matrix powers, eigenvalues via the QR algorithm, eigenvectors by inverse iteration, and least squares; vector dot/cross products, norms, angles and projections |
| `mathkit.numbertheory` | Miller-Rabin primality, the sieve of Eratosthenes, Pollard's rho factorization, divisors, sigma, totient and Moebius; modular inverses and the Chinese remainder theorem; continued fractions; Fibonacci (fast doubling), Catalan, Collatz, harmonic and Bernoulli numbers; base conversion |
| `mathkit.statistics` | mean/median/mode, variance, quantiles, skewness, kurtosis, z-scores, covariance and correlation; linear and polynomial regression; permutations, combinations and multinomials; binomial, Poisson, geometric, normal, exponential and uniform distributions; confidence intervals |
| `mathkit.geometry` | distances, lines and intersections; circles and solids; triangle solving with Heron's formula and the laws of sines and cosines; polygon area, perimeter, centroid, point-in-polygon and convex hull |
| `mathkit.interpolation` | Lagrange and Newton divided-difference interpolation, piecewise linear interpolation, natural cubic splines, Chebyshev nodes, and least-squares, exponential and power fits |
| `mathkit.plotting` | ASCII line plots, value tables, histograms and bar charts |

### Command line

Every command accepts expressions wherever a number is expected, so `pi/2`,
`-inf` and `2**10` all work as arguments.

```
eval        evaluate an expression              simplify    simplify symbolically
diff        differentiate (symbolic or numeric) integrate   definite integral
limit       estimate a limit                    taylor      Taylor series
ode         solve y' = f(t, y)                  solve       real roots on an interval
roots       every root of a polynomial          poly        inspect a polynomial
matrix      determinant, inverse, eigenvalues   primes      list primes
factor      prime factorization                 gcd         GCD, LCM and Bezout
sequence    Fibonacci, Catalan, Collatz, ...    convert     change number base
stats       summarize a sample                  regress     fit a line or curve
interpolate interpolate through points          triangle    solve a triangle
polygon     area, centroid and hull             plot        ASCII graph
table       tabulate an expression              repl        interactive calculator
```

A few examples:

```console
$ python3 -m mathkit diff "x**3 * exp(x)" --at 1
d/dx [x ** 3 * exp(x)] = 3 * x ** 2 * exp(x) + x ** 3 * exp(x)
at x = 1: 10.8731273138

$ python3 -m mathkit integrate "exp(-x**2)" -inf inf
integral of exp(-x**2) dx from -inf to inf = 1.77245385091

$ python3 -m mathkit matrix "4,3;6,3" --solve 10 12
determinant = -6
solution of A x = b:
  x1 = 1
  x2 = 2

$ python3 -m mathkit plot "sin(x)/x" -20 20 --width 60 --height 13
```

### Interactive mode

`python3 -m mathkit repl` starts a calculator with variables and shorthand
for the common operations:

```
>>> r = 2.5
r = 2.5
>>> pi * r**2
= 19.6349540849
>>> d/dx x**2 * sin(x)
d/dx [x**2 * sin(x)] = 2 * x * sin(x) + x ** 2 * cos(x)
>>> int exp(-x**2) 0 1
= 0.746824132812
>>> solve cos(x) - x 0 2
x = 0.739085133215
```

### Running the tests

```bash
python3 -m unittest discover -s tests -t .
```

The suite covers each module plus the CLI end to end, and runs the doctests
embedded in the module docstrings.

### Known limits

* Symbolic work covers differentiation and simplification, not integration:
  definite integrals are computed numerically. The simplifier folds constants
  and applies identities but does not collect like terms, so a derivative may
  read `6 * x + 6 * x` rather than `12 * x`.
* `Matrix.eigenvalues` uses the unshifted QR algorithm and returns real
  eigenvalues only; it is intended for symmetric or real-spectrum matrices.
* `calculus.limit` samples and extrapolates numerically. It detects fast
  divergence, but a slowly divergent limit such as `ln(x)` as `x -> 0+`
  returns a large finite value rather than `-inf`.

## harmonic_numbers.py

A standalone script that predates the package, computing exact harmonic
numbers with `fractions.Fraction`:

```bash
python3 harmonic_numbers.py 10 --all
```

The same function is available as `mathkit.numbertheory.harmonic_number`.
