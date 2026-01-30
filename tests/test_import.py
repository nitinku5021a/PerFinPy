import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from openpyxl import Workbook
from app import create_app, db
from app.models import Account, JournalEntry

app = create_app()

# Create test Excel file
wb = Workbook()
ws = wb.active
ws.title = "Transactions"

# Add header
ws.append(['Date', 'Debit Account', 'Description', 'Amount', 'Credit Account'])

# Add sample data
sample_data = [
    ['02-08-2012', 'Expense:Rental Expense:House Rent', 'Rent_Aug', 11006, 'Asset:Saving Bank Account:ICICI Bank-S'],
    ['02-08-2012', 'Expense:Utility Payments:Electricity', 'Electricity Bill', 557, 'Asset:Saving Bank Account:Cash'],
    ['02-08-2012', 'Expense:Conveyance:Public Transport', 'Bus tickets', 1220, 'Asset:Saving Bank Account:Cash'],
    ['02-08-2012', 'Expense:Grocery:Other grocery', 'Aatta(10 kg)', 219, 'Asset:Saving Bank Account:sodexo'],
    ['02-08-2012', 'Expense:Grocery:Fruits', 'Apple (3.5 kg)', 540, 'Asset:Saving Bank Account:sodexo'],
    ['02-08-2012', 'Expense:Grocery:Other grocery', 'Ghee', 189, 'Asset:Saving Bank Account:sodexo'],
    ['02-08-2012', 'Expense:Grocery:Other grocery', 'Chilli powder', 25, 'Asset:Saving Bank Account:sodexo'],
    ['02-08-2012', 'Expense:Grocery:Vegitable', 'Ginger', 13, 'Asset:Saving Bank Account:sodexo'],
    ['02-08-2012', 'Expense:Grocery:Other grocery', 'Curd', 17, 'Asset:Saving Bank Account:sodexo'],
    ['02-08-2012', 'Expense:Grocery:Vegitable', 'Potato(3.75 kg)', 100, 'Asset:Saving Bank Account:sodexo'],
    ['02-08-2012', 'Expense:Grocery:Vegitable', 'onion', 30, 'Asset:Saving Bank Account:sodexo'],
    ['02-08-2012', 'Expense:Daily Exp:Outside Food', 'KFC', 280, 'Asset:Saving Bank Account:Cash'],
    ['04-08-2012', 'Expense:Grocery:Non-Veg', 'SeaFood', 310, 'Asset:Saving Bank Account:Cash'],
    ['04-08-2012', 'Expense:Utility Payments:Drinking Water', 'Water-2 CAN', 70, 'Asset:Saving Bank Account:Cash'],
    ['05-08-2012', 'Expense:Grocery:Non-Veg', 'egg', 53, 'Asset:Saving Bank Account:Cash'],
    ['05-08-2012', 'Expense:Grocery:Vegitable', 'capcicum+chilly', 15, 'Asset:Saving Bank Account:Cash'],
    ['05-08-2012', 'Expense:Grocery:Other grocery', 'Haldiram Bhujia', 65, 'Asset:Saving Bank Account:Cash'],
    ['05-08-2012', 'Expense:Grocery:Other grocery', 'Haldiram Mixture', 58, 'Asset:Saving Bank Account:Cash'],
    ['05-08-2012', 'Expense:Grocery:Other grocery', 'Maggie masala', 40, 'Asset:Saving Bank Account:sodexo'],
    ['05-08-2012', 'Expense:Grocery:Other grocery', 'Curd', 16, 'Asset:Saving Bank Account:Cash'],
    ['05-08-2012', 'Expense:Grocery:Other grocery', 'Tomato sauce', 38, 'Asset:Saving Bank Account:Cash'],
    ['05-08-2012', 'Expense:Grocery:Other grocery', 'Dhara OIL', 123, 'Asset:Saving Bank Account:sodexo'],
]

for row_data in sample_data:
    ws.append(row_data)

# Save to file
excel_path = 'd:\\Work\\PerFinPy\\tests\\sample_transactions.xlsx'
wb.save(excel_path)
print(f"Created test Excel file: {excel_path}")

# Test import
print("\nTesting import...")
with app.app_context():
    # Delete old db to start fresh
    import os
    db_path = 'd:\\Work\\PerFinPy\\accounting.db'
    if os.path.exists(db_path):
        os.remove(db_path)
        print("Deleted old database")
    
    # Create tables
    db.create_all()
    print("Created database tables")
    
    # Import using test client
    client = app.test_client()
    
    # Open file and import
    with open(excel_path, 'rb') as f:
        response = client.post(
            '/transactions/import',
            data={'file': (f, 'sample_transactions.xlsx')},
            follow_redirects=True
        )
        print(f"Import request status: {response.status_code}")
    
    # Check results
    print("\n=== Import Results ===")
    accounts_count = Account.query.count()
    entries_count = JournalEntry.query.count()
    
    print(f"Accounts created: {accounts_count}")
    print(f"Journal entries created: {entries_count}")
    
    # Check hierarchy
    print("\n=== Account Hierarchy ===")
    expense_accounts = Account.query.filter_by(account_type='Expense', parent_id=None).all()
    asset_accounts = Account.query.filter_by(account_type='Asset', parent_id=None).all()
    
    print(f"\nExpense Groups ({len(expense_accounts)}):")
    for parent in expense_accounts:
        print(f"  {parent.name}")
        for child in parent.children:
            print(f"    ├─ {child.name}")
            for grandchild in child.children:
                print(f"    │  └─ {grandchild.name}")
    
    print(f"\nAsset Groups ({len(asset_accounts)}):")
    for parent in asset_accounts:
        print(f"  {parent.name}")
        for child in parent.children:
            print(f"    ├─ {child.name}")
            for grandchild in child.children:
                print(f"    │  └─ {grandchild.name}")
    
    # Check balances
    print("\n=== Account Balances ===")
    for parent in expense_accounts[:2]:
        balance = parent.get_group_balance()
        print(f"{parent.name}: {balance}")
    
    for parent in asset_accounts[:2]:
        balance = parent.get_group_balance()
        print(f"{parent.name}: {balance}")
