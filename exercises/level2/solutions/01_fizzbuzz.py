"""Solution to Level 2, Exercise 1: FizzBuzz."""


def fizzbuzz(n):
    results = []
    for number in range(1, n + 1):
        if number % 3 == 0 and number % 5 == 0:
            results.append("FizzBuzz")
        elif number % 3 == 0:
            results.append("Fizz")
        elif number % 5 == 0:
            results.append("Buzz")
        else:
            results.append(str(number))
    return results


if __name__ == "__main__":
    assert fizzbuzz(0) == []
    assert fizzbuzz(1) == ["1"]
    assert fizzbuzz(5) == ["1", "2", "Fizz", "4", "Buzz"]
    assert fizzbuzz(15)[14] == "FizzBuzz"
    assert len(fizzbuzz(100)) == 100
    assert fizzbuzz(100).count("Fizz") == 27
    assert fizzbuzz(100).count("Buzz") == 14
    print("All checks passed!")
