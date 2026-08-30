categories = {
    "Indian": {
        "Paratha": {"price": 365, "quantity": 5},
        "Tandoori Roti": {"price": 210, "quantity": 10}
    },
    "Chinese": {
        "Dumplings": {"price": 100, "quantity": 20},
        "Hakka Noodles": {"price": 210, "quantity": 30}
    },
    "Italian": {
        "Pizza": {"price": 250, "quantity": 10}
    }
}


def order(categories):
    while True:
        print("\n--- Place Your Order ---")

        # Get category input (keep asking until valid; only 'exit' leaves)
        while True:
            category_name_input = input("Enter category (Indian, Chinese, Italian) or type 'exit' to quit: ").strip()
            if category_name_input.lower() == 'exit':
                print("Exiting order system. Goodbye!")
                return

            category_name = category_name_input.title()
            if category_name not in categories:
                print(f"Error: Category '{category_name}' not found. Please choose from {', '.join(categories.keys())}.\n")
                continue

            break

        selected_category = categories[category_name]
        print(f"Dishes in {category_name}: {', '.join(selected_category.keys())}")

        # Get dish input (keep asking until valid; only 'exit' leaves)
        while True:
            dish_name_input = input(f"Enter dish from {category_name} or type 'exit' to quit: ").strip()
            if dish_name_input.lower() == 'exit':
                print("Exiting order system. Goodbye!")
                return

            dish_name = dish_name_input.title()
            if dish_name not in selected_category:
                print(f"Error: Dish '{dish_name}' not found in {category_name}. Please choose from {', '.join(selected_category.keys())}.\n")
                continue

            break

        selected_dish = selected_category[dish_name]

        # Get quantity input (keep asking until valid; only 'exit' leaves)
        while True:
            quantity_input_str = input(f"Enter quantity for {dish_name} (available: {selected_dish['quantity']}) or type 'exit' to quit: ").strip()
            if quantity_input_str.lower() == 'exit':
                print("Exiting order system. Goodbye!")
                return

            try:
                quantity_ordered = int(quantity_input_str)
            except ValueError:
                print("Error: Invalid quantity. Please enter a number.\n")
                continue

            if quantity_ordered <= 0:
                print("Error: Quantity must be a positive number.\n")
                continue

            # Check availability
            if quantity_ordered > selected_dish['quantity']:
                print(f"Sorry, only {selected_dish['quantity']} of {dish_name} are available.\n")
                continue

            break

        # Process order
        total_price = quantity_ordered * selected_dish['price']
        selected_dish['quantity'] -= quantity_ordered

        print(f"\nOrder confirmed: {quantity_ordered} x {dish_name} from {category_name}.")
        print(f"Total price: ${total_price}")
        print(f"Remaining {dish_name} quantity: {selected_dish['quantity']}")
        print("--- Order Complete ---\n")

        # Keep asking for another order until the user chooses to quit
        while True:
            another_order = input("Do you want to place another order? (yes/no or 'exit' to quit): ").strip().lower()
            if another_order in ('no', 'n', 'exit'):
                print("Exiting order system. Goodbye!")
                return
            if another_order in ('yes', 'y'):
                break
            print("Error: Please answer 'yes' or 'no'.\n")


order(categories)
