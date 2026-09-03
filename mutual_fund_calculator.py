"""Interactive mutual fund return calculator for SIP and lumpsum investments."""


def sip_future_value(monthly_investment: float, annual_rate: float, years: float) -> float:
    """Future value of a monthly SIP, assuming contributions at the start of each month."""
    if monthly_investment <= 0:
        raise ValueError("monthly investment must be greater than 0")
    if annual_rate < 0:
        raise ValueError("expected return rate cannot be negative")
    if years <= 0:
        raise ValueError("investment period must be greater than 0")

    months = int(round(years * 12))
    monthly_rate = annual_rate / 12 / 100
    if monthly_rate == 0:
        return monthly_investment * months
    growth = (1 + monthly_rate) ** months
    return monthly_investment * (growth - 1) / monthly_rate * (1 + monthly_rate)


def lumpsum_future_value(principal: float, annual_rate: float, years: float) -> float:
    """Future value of a one-time investment compounded annually."""
    if principal <= 0:
        raise ValueError("investment amount must be greater than 0")
    if annual_rate < 0:
        raise ValueError("expected return rate cannot be negative")
    if years <= 0:
        raise ValueError("investment period must be greater than 0")

    return principal * (1 + annual_rate / 100) ** years


def read_float(prompt: str) -> float:
    """Keep asking until the user types a number."""
    while True:
        try:
            return float(input(prompt).strip())
        except ValueError:
            print("False input: that is not a number. Please try again.")
        except EOFError:
            raise KeyboardInterrupt


def report(invested: float, future_value: float) -> None:
    gain = future_value - invested
    print(f"\n  Total invested   : {invested:,.2f}")
    print(f"  Estimated returns: {gain:,.2f}")
    print(f"  Total value      : {future_value:,.2f}\n")


def run_sip() -> None:
    monthly = read_float("Monthly investment amount: ")
    rate = read_float("Expected annual return rate (%): ")
    years = read_float("Investment period (years): ")
    try:
        future_value = sip_future_value(monthly, rate, years)
    except ValueError as error:
        print(f"False input: {error}.")
        return
    report(monthly * int(round(years * 12)), future_value)


def run_lumpsum() -> None:
    principal = read_float("Lumpsum investment amount: ")
    rate = read_float("Expected annual return rate (%): ")
    years = read_float("Investment period (years): ")
    try:
        future_value = lumpsum_future_value(principal, rate, years)
    except ValueError as error:
        print(f"False input: {error}.")
        return
    report(principal, future_value)


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
