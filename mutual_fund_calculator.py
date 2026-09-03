"""Interactive mutual fund return calculator for SIP and lumpsum investments."""


def sip_future_value(monthly_investment: float, annual_rate: float, years: float) -> float:
    """Future value of a monthly SIP, assuming contributions at the start of each month."""
    months = int(round(years * 12))
    monthly_rate = annual_rate / 12 / 100
    if monthly_rate == 0:
        return monthly_investment * months
    growth = (1 + monthly_rate) ** months
    return monthly_investment * (growth - 1) / monthly_rate * (1 + monthly_rate)


def lumpsum_future_value(principal: float, annual_rate: float, years: float) -> float:
    """Future value of a one-time investment compounded annually."""
    return principal * (1 + annual_rate / 100) ** years


def check_amount(value: float) -> None:
    if value <= 0:
        raise ValueError("the amount must be greater than 0")


def check_rate(value: float) -> None:
    if value < 0:
        raise ValueError("the return rate cannot be negative")
    if value > 100:
        raise ValueError("a return rate above 100% is not realistic")


def check_years(value: float) -> None:
    if value <= 0:
        raise ValueError("the investment period must be greater than 0")
    if value > 100:
        raise ValueError("the investment period cannot be more than 100 years")


def read_float(prompt: str, check) -> float:
    """Ask for one number and re-ask that same field until it is valid."""
    while True:
        try:
            text = input(prompt).strip()
        except EOFError:
            raise KeyboardInterrupt

        try:
            value = float(text)
        except ValueError:
            print(f"  False input: '{text}' is not a number. Please enter this value again.")
            continue

        try:
            check(value)
        except ValueError as error:
            print(f"  False input: {error}. Please enter this value again.")
            continue

        return value


def report(invested: float, future_value: float) -> None:
    gain = future_value - invested
    print(f"\n  Total invested   : {invested:,.2f}")
    print(f"  Estimated returns: {gain:,.2f}")
    print(f"  Total value      : {future_value:,.2f}\n")


def run_sip() -> None:
    monthly = read_float("Monthly investment amount: ", check_amount)
    rate = read_float("Expected annual return rate (%): ", check_rate)
    years = read_float("Investment period (years): ", check_years)
    report(monthly * int(round(years * 12)), sip_future_value(monthly, rate, years))


def run_lumpsum() -> None:
    principal = read_float("Lumpsum investment amount: ", check_amount)
    rate = read_float("Expected annual return rate (%): ", check_rate)
    years = read_float("Investment period (years): ", check_years)
    report(principal, lumpsum_future_value(principal, rate, years))


MENU = """
Mutual Fund Return Calculator
  1. Monthly (SIP) investment
  2. Lumpsum investment
  3. Quit
"""


def main() -> None:
    while True:
        print(MENU)
        try:
            choice = input("Your choice (1/2/3): ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        try:
            if choice in ("1", "sip", "monthly"):
                run_sip()
            elif choice in ("2", "lumpsum", "lump"):
                run_lumpsum()
            elif choice in ("3", "q", "quit", "exit"):
                print("Goodbye!")
                break
            else:
                print(f"False input: '{choice}' is not a valid choice. Pick 1, 2 or 3.")
        except KeyboardInterrupt:
            print("\nCancelled. Back to the menu.")
        except Exception as error:  # last resort so the calculator never crashes
            print(f"False input: something went wrong ({error}).")


if __name__ == "__main__":
    main()
