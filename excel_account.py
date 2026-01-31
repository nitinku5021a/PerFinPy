import pandas as pd
import re

# ========= CONFIG =========
input_file = "Transactions.xlsx"
sheet_name = "Transactions"
output_file = "cleaned_output.xlsx"

# ========= LOAD =========
df = pd.read_excel(input_file, sheet_name=sheet_name)
df.columns = df.columns.str.strip()

# ========= REMOVE ZERO AMOUNT =========
before = len(df)
df = df[df["amount"] != 0].copy()
print(f"Removed {before - len(df)} rows with amount 0.")

# ========= ACCOUNT FORMAT CHECK =========
# Expected format: Type:Group:Account
pattern = re.compile(r"^[^:]+:[^:]+:[^:]+$")

accounts = set(df["Debit account"].astype(str)) | \
           set(df["Credit account"].astype(str))

invalid_accounts = sorted([a for a in accounts if not pattern.match(a)])

# ========= INTERACTIVE FIX =========
for acc in invalid_accounts:
    print("\nAccount not in required format:")
    print("  ", acc)

    new_acc = input("Enter corrected account (Type:Group:Account): ").strip()

    while not pattern.match(new_acc):
        new_acc = input("Invalid format. Re-enter: ").strip()

    # replace everywhere
    df.loc[df["Debit account"] == acc, "Debit account"] = new_acc
    df.loc[df["Credit account"] == acc, "Credit account"] = new_acc

print("\nAll accounts validated.")

# ========= DATE FORMAT =========
df["Date"] = pd.to_datetime(df["Date"]).dt.strftime("%d-%m-%Y")

# ========= SAVE =========
df.to_excel(output_file, index=False)
print(f"Cleaned file saved to {output_file}")
