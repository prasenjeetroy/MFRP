"""A console financial tracker with a shop, quiz rewards and coin discounts.

Everything the program remembers lives in plain dictionaries: the shop
catalogue, the quiz bank, the reward rules and the user's wallet. Run it with
``python finance_tracker.py`` and answer the prompts.
"""

import math

CURRENCY = "$"

# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

STORE = {
    "1": {
        "name": "Grocery",
        "items": {
            "1": {"name": "Rice (5 kg)", "price": 12.50},
            "2": {"name": "Milk (1 L)", "price": 1.20},
            "3": {"name": "Vegetable basket", "price": 8.75},
            "4": {"name": "Coffee beans (500 g)", "price": 15.00},
        },
    },
    "2": {
        "name": "Technology",
        "items": {
            "1": {"name": "Wireless mouse", "price": 25.00},
            "2": {"name": "Mechanical keyboard", "price": 89.99},
            "3": {"name": "USB-C hub", "price": 42.00},
            "4": {"name": "Noise cancelling headphones", "price": 199.00},
        },
    },
    "3": {
        "name": "Transport",
        "items": {
            "1": {"name": "Monthly bus pass", "price": 45.00},
            "2": {"name": "Fuel (20 L)", "price": 30.00},
            "3": {"name": "Bike service", "price": 22.50},
        },
    },
    "4": {
        "name": "Entertainment",
        "items": {
            "1": {"name": "Cinema ticket", "price": 11.00},
            "2": {"name": "Streaming subscription", "price": 9.99},
            "3": {"name": "Board game", "price": 34.50},
        },
    },
    "5": {
        "name": "Health",
        "items": {
            "1": {"name": "Gym day pass", "price": 7.00},
            "2": {"name": "Vitamins (60 tablets)", "price": 18.40},
            "3": {"name": "Dental check-up", "price": 60.00},
        },
    },
}

# Questions are grouped by level. Harder levels pay more coins per answer.
QUIZZES = {
    1: [
        {
            "question": "What does a 'budget' mainly help you do?",
            "options": {
                "a": "Plan how you spend and save money",
                "b": "Borrow money faster",
                "c": "Avoid paying taxes",
            },
            "answer": "a",
        },
        {
            "question": "Money kept aside for unexpected costs is called...",
            "options": {
                "a": "A luxury fund",
                "b": "An emergency fund",
                "c": "A shopping fund",
            },
            "answer": "b",
        },
        {
            "question": "Which of these is a 'need' rather than a 'want'?",
            "options": {
                "a": "A new game console",
                "b": "Groceries for the week",
                "c": "A second smartwatch",
            },
            "answer": "b",
        },
    ],
    2: [
        {
            "question": "Simple interest on 1000 at 5% for 2 years is...",
            "options": {"a": "50", "b": "100", "c": "150"},
            "answer": "b",
        },
        {
            "question": "Inflation means that over time your money generally...",
            "options": {
                "a": "Buys less than before",
                "b": "Buys more than before",
                "c": "Stays exactly the same",
            },
            "answer": "a",
        },
        {
            "question": "Paying only the minimum on a credit card usually leads to...",
            "options": {
                "a": "A lower total cost",
                "b": "More interest paid overall",
                "c": "The balance clearing faster",
            },
            "answer": "b",
        },
    ],
    3: [
        {
            "question": "Diversifying investments mainly reduces...",
            "options": {
                "a": "Risk of a single asset hurting you",
                "b": "The paperwork you must file",
                "c": "The tax you owe",
            },
            "answer": "a",
        },
        {
            "question": "Compound interest differs from simple interest because it...",
            "options": {
                "a": "Ignores the time period",
                "b": "Earns interest on earlier interest",
                "c": "Is always a fixed amount",
            },
            "answer": "b",
        },
        {
            "question": "A 'net worth' figure is calculated as...",
            "options": {
                "a": "Income minus expenses",
                "b": "Assets minus liabilities",
                "c": "Savings plus salary",
            },
            "answer": "b",
        },
    ],
}

# Rules that turn quiz performance into money off a purchase.
REWARD_RULES = {
    "coins_per_correct": 10,      # multiplied by the level of the quiz
    "perfect_bonus": 25,          # extra coins for answering every question right
    "correct_per_level": 5,       # correct answers needed to gain one level
    "max_level": 5,
    "coin_value": 0.25,           # what one coin is worth in currency
    "pct_per_level": 3,           # discount % granted by the level alone
    "pct_per_accuracy": 20,       # discount % granted by a perfect accuracy
    "max_discount_pct": 40,       # hard ceiling on any single purchase
}

# The single dictionary that holds everything about the person using the app.
user = {
    "name": "Guest",
    "balance": 0.0,
    "coins": 0,
    "level": 1,
    "quiz": {"asked": 0, "correct": 0},
    "spending": {},   # category name -> total spent
    "history": [],    # list of dictionaries, one per transaction
}


# ---------------------------------------------------------------------------
# Small input helpers
# ---------------------------------------------------------------------------

def money(amount):
    """Format a number the way the rest of the program prints money."""
    return "{}{:.2f}".format(CURRENCY, amount)


def ask_text(prompt):
    return input(prompt).strip()


def ask_choice(prompt, valid):
    """Keep asking until the answer is one of the accepted keys."""
    while True:
        choice = input(prompt).strip().lower()
        if choice in valid:
            return choice
        print("  Please choose one of: {}".format(", ".join(sorted(valid))))


def ask_amount(prompt):
    """Read a positive amount of money. Returns None if the user cancels."""
    while True:
        raw = input(prompt).strip()
        if raw == "" or raw.lower() in ("c", "cancel"):
            return None
        try:
            value = float(raw)
        except ValueError:
            print("  That is not a number. Try again, or press Enter to cancel.")
            continue
        if value <= 0:
            print("  Enter an amount greater than zero.")
            continue
        return round(value, 2)


def ask_yes_no(prompt):
    return ask_choice(prompt, {"y", "n"}) == "y"


# ---------------------------------------------------------------------------
# Wallet, levels and discounts
# ---------------------------------------------------------------------------

def accuracy(person):
    """Fraction of quiz questions answered correctly, 0.0 when none asked."""
    asked = person["quiz"]["asked"]
    if asked == 0:
        return 0.0
    return person["quiz"]["correct"] / asked


def update_level(person):
    """Recalculate the level from the number of correct answers."""
    rules = REWARD_RULES
    earned = 1 + person["quiz"]["correct"] // rules["correct_per_level"]
    new_level = min(earned, rules["max_level"])
    if new_level > person["level"]:
        person["level"] = new_level
        print("\n  *** Level up! You are now level {}. ***".format(new_level))
    return person["level"]


def discount_offer(person, subtotal):
    """Work out the best discount the person can claim on this subtotal.

    Returns a dictionary describing the offer so the caller can print it and
    then apply it.
    """
    rules = REWARD_RULES
    percent = person["level"] * rules["pct_per_level"]
    percent += accuracy(person) * rules["pct_per_accuracy"]
    percent = min(percent, rules["max_discount_pct"])

    cap = subtotal * percent / 100.0
    coins_worth = person["coins"] * rules["coin_value"]
    amount = round(min(cap, coins_worth), 2)

    coins_needed = 0
    if amount > 0:
        coins_needed = math.ceil(amount / rules["coin_value"])
        coins_needed = min(coins_needed, person["coins"])

    return {
        "percent": percent,
        "cap": round(cap, 2),
        "amount": amount,
        "coins_needed": coins_needed,
    }


def add_funds(person):
    print("\n-- Add money --")
    print("  Current balance: {}".format(money(person["balance"])))
    amount = ask_amount("  Amount to add (Enter to cancel): ")
    if amount is None:
        print("  Cancelled.")
        return
    person["balance"] = round(person["balance"] + amount, 2)
    person["history"].append({"type": "deposit", "detail": "Added funds", "amount": amount})
    print("  Added {}. New balance: {}".format(money(amount), money(person["balance"])))


# ---------------------------------------------------------------------------
# Shopping
# ---------------------------------------------------------------------------

def show_categories():
    print("\n  Categories:")
    for key, category in STORE.items():
        print("   {}. {} ({} items)".format(key, category["name"], len(category["items"])))


def show_items(category):
    print("\n  {} items:".format(category["name"]))
    for key, item in category["items"].items():
        print("   {}. {:<32} {}".format(key, item["name"], money(item["price"])))


def build_cart(person):
    """Let the person pick items until they are done. Returns a list of dicts."""
    cart = []
    while True:
        show_categories()
        print("   0. Done shopping")
        choice = ask_choice("  Choose a category: ", set(STORE) | {"0"})
        if choice == "0":
            break

        category = STORE[choice]
        show_items(category)
        print("   0. Back to categories")
        item_choice = ask_choice("  Choose an item: ", set(category["items"]) | {"0"})
        if item_choice == "0":
            continue

        item = category["items"][item_choice]
        quantity = None
        while quantity is None:
            raw = input("  Quantity (Enter for 1): ").strip()
            if raw == "":
                quantity = 1
            elif raw.isdigit() and int(raw) > 0:
                quantity = int(raw)
            else:
                print("  Enter a whole number greater than zero.")

        line_total = round(item["price"] * quantity, 2)
        cart.append({
            "category": category["name"],
            "name": item["name"],
            "price": item["price"],
            "quantity": quantity,
            "total": line_total,
        })
        print("  Added {} x {} = {}".format(quantity, item["name"], money(line_total)))
        print("  Cart total so far: {}".format(money(cart_total(cart))))
    return cart


def cart_total(cart):
    return round(sum(line["total"] for line in cart), 2)


def show_cart(cart):
    print("\n  Your cart:")
    for line in cart:
        print("   {} x {:<28} {:>10}".format(line["quantity"], line["name"], money(line["total"])))
    print("   {:<32} {:>10}".format("Subtotal", money(cart_total(cart))))


def checkout(person, cart):
    """Apply any discount the person wants, take the money, record the spend."""
    subtotal = cart_total(cart)
    show_cart(cart)

    offer = discount_offer(person, subtotal)
    discount = 0.0
    coins_used = 0

    print("\n  Reward status: level {}, accuracy {:.0f}%, {} coins".format(
        person["level"], accuracy(person) * 100, person["coins"]))
    print("  Your rewards unlock up to {:.1f}% off ({} max on this cart).".format(
        offer["percent"], money(offer["cap"])))

    if offer["amount"] <= 0:
        if person["coins"] == 0:
            print("  You have no coins yet - win a quiz to earn some.")
    else:
        print("  Spending {} coins would take {} off.".format(
            offer["coins_needed"], money(offer["amount"])))
        if ask_yes_no("  Use your coins now? (y/n): "):
            discount = offer["amount"]
            coins_used = offer["coins_needed"]

    total = round(subtotal - discount, 2)
    print("\n  Subtotal: {}".format(money(subtotal)))
    print("  Discount: -{}".format(money(discount)))
    print("  To pay:   {}".format(money(total)))

    if total > person["balance"]:
        print("  Not enough money. Balance is {}; you need {} more.".format(
            money(person["balance"]), money(round(total - person["balance"], 2))))
        print("  Purchase cancelled - add money and try again.")
        return

    if not ask_yes_no("  Confirm purchase? (y/n): "):
        print("  Purchase cancelled.")
        return

    person["balance"] = round(person["balance"] - total, 2)
    person["coins"] -= coins_used

    for line in cart:
        # Split the discount over the lines so each category is charged fairly.
        share = line["total"] / subtotal if subtotal else 0
        paid = round(line["total"] - discount * share, 2)
        spending = person["spending"]
        spending[line["category"]] = round(spending.get(line["category"], 0.0) + paid, 2)

    person["history"].append({
        "type": "purchase",
        "detail": "{} item line(s)".format(len(cart)),
        "amount": total,
        "discount": discount,
        "coins_used": coins_used,
    })

    print("\n  Paid {}. Coins spent: {}. Coins left: {}.".format(
        money(total), coins_used, person["coins"]))
    print("  Remaining balance: {}".format(money(person["balance"])))


def go_shopping(person):
    print("\n-- Shop --")
    print("  Balance: {} | Coins: {}".format(money(person["balance"]), person["coins"]))
    cart = build_cart(person)
    if not cart:
        print("  Nothing in the cart.")
        return
    checkout(person, cart)


# ---------------------------------------------------------------------------
# Quiz
# ---------------------------------------------------------------------------

def run_quiz(person):
    """Ask the questions for the person's level and pay out coins."""
    level = min(person["level"], max(QUIZZES))
    questions = QUIZZES[level]
    per_correct = REWARD_RULES["coins_per_correct"] * level

    print("\n-- Quiz (level {}) --".format(level))
    print("  {} questions, {} coins for each correct answer.".format(
        len(questions), per_correct))

    correct_here = 0
    for number, entry in enumerate(questions, start=1):
        print("\n  Q{}. {}".format(number, entry["question"]))
        for key, text in entry["options"].items():
            print("     {}) {}".format(key, text))
        given = ask_choice("  Your answer: ", set(entry["options"]))
        person["quiz"]["asked"] += 1
        if given == entry["answer"]:
            person["quiz"]["correct"] += 1
            correct_here += 1
            print("  Correct! +{} coins.".format(per_correct))
        else:
            right = entry["answer"]
            print("  Not quite. The answer was {}) {}".format(right, entry["options"][right]))

    earned = correct_here * per_correct
    if correct_here == len(questions):
        earned += REWARD_RULES["perfect_bonus"]
        print("\n  Perfect round! Bonus {} coins.".format(REWARD_RULES["perfect_bonus"]))

    person["coins"] += earned
    print("\n  Score: {}/{}. Coins earned: {}. Total coins: {}.".format(
        correct_here, len(questions), earned, person["coins"]))
    update_level(person)

    preview = discount_offer(person, 100.0)
    print("  Your rewards are now worth up to {:.1f}% off a purchase.".format(preview["percent"]))


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

def show_report(person):
    print("\n-- Report for {} --".format(person["name"]))
    print("  Balance : {}".format(money(person["balance"])))
    print("  Coins   : {} (worth {})".format(
        person["coins"], money(person["coins"] * REWARD_RULES["coin_value"])))
    print("  Level   : {} of {}".format(person["level"], REWARD_RULES["max_level"]))
    print("  Quiz    : {}/{} correct ({:.0f}% accuracy)".format(
        person["quiz"]["correct"], person["quiz"]["asked"], accuracy(person) * 100))

    spending = person["spending"]
    if not spending:
        print("\n  No spending recorded yet.")
    else:
        spent = round(sum(spending.values()), 2)
        print("\n  Spending by category (total {}):".format(money(spent)))
        for category, amount in sorted(spending.items(), key=lambda pair: -pair[1]):
            share = amount / spent * 100 if spent else 0
            bar = "#" * int(round(share / 5))
            print("   {:<16} {:>10}  {:>5.1f}%  {}".format(category, money(amount), share, bar))

    if person["history"]:
        print("\n  Last transactions:")
        for record in person["history"][-5:]:
            if record["type"] == "deposit":
                print("   + {:<24} {}".format(record["detail"], money(record["amount"])))
            else:
                extra = ""
                if record.get("discount"):
                    extra = "  (saved {} with {} coins)".format(
                        money(record["discount"]), record["coins_used"])
                print("   - {:<24} {}{}".format(record["detail"], money(record["amount"]), extra))


def show_rewards(person):
    rules = REWARD_RULES
    print("\n-- How rewards work --")
    print("  Win quiz questions to earn coins: {} coins x the quiz level per answer,".format(
        rules["coins_per_correct"]))
    print("  plus {} bonus coins for a perfect round.".format(rules["perfect_bonus"]))
    print("  Every {} correct answers raises your level (max {}).".format(
        rules["correct_per_level"], rules["max_level"]))
    print("\n  Discount unlocked = level x {}% + accuracy x {}%, capped at {}%.".format(
        rules["pct_per_level"], rules["pct_per_accuracy"], rules["max_discount_pct"]))
    print("  Each coin you spend is worth {} off, up to that cap.".format(
        money(rules["coin_value"])))
    offer = discount_offer(person, 100.0)
    print("\n  Right now: level {}, accuracy {:.0f}% -> up to {:.1f}% off,".format(
        person["level"], accuracy(person) * 100, offer["percent"]))
    print("  and your {} coins are worth {}.".format(
        person["coins"], money(person["coins"] * rules["coin_value"])))


# ---------------------------------------------------------------------------
# Menu
# ---------------------------------------------------------------------------

MENU = {
    "1": "Add money to my balance",
    "2": "Buy something (shop by category)",
    "3": "Play the quiz and win coins",
    "4": "See my report",
    "5": "How coins and discounts work",
    "6": "Quit",
}


def show_menu(person):
    print("\n" + "=" * 52)
    print(" {} | balance {} | {} coins | level {}".format(
        person["name"], money(person["balance"]), person["coins"], person["level"]))
    print("=" * 52)
    for key, label in MENU.items():
        print("  {}. {}".format(key, label))


def start(person):
    print("=" * 52)
    print(" Financial Tracker with Quiz Rewards")
    print("=" * 52)
    name = ask_text("Your name: ")
    if name:
        person["name"] = name
    print("\nHello {}! Let's set up your wallet.".format(person["name"]))
    opening = ask_amount("Starting balance (Enter for 0): ")
    if opening:
        person["balance"] = opening
        person["history"].append({"type": "deposit", "detail": "Opening balance", "amount": opening})


def main():
    actions = {
        "1": add_funds,
        "2": go_shopping,
        "3": run_quiz,
        "4": show_report,
        "5": show_rewards,
    }
    start(user)
    while True:
        show_menu(user)
        choice = ask_choice("  Choose an option: ", set(MENU))
        if choice == "6":
            show_report(user)
            print("\nThanks for using the tracker, {}. Goodbye!".format(user["name"]))
            break
        actions[choice](user)


if __name__ == "__main__":
    try:
        main()
    except (EOFError, KeyboardInterrupt):
        print("\nSession ended.")
