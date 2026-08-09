"""Solution to Exercise 2: Build a multiplication table."""


def times_table(number, up_to):
    results = []
    for i in range(1, up_to + 1):
        results.append(number * i)
    return results


if __name__ == "__main__":
    assert times_table(3, 5) == [3, 6, 9, 12, 15]
    assert times_table(7, 3) == [7, 14, 21]
    assert times_table(10, 1) == [10]
    assert times_table(4, 0) == []
    print("All checks passed!")

    for value in times_table(6, 10):
        print(value)
