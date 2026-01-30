# PerFinPy - Personal Finance Accounting System

A simple yet comprehensive personal finance accounting system built with Flask, SQLAlchemy, and SQLite. This system implements double-entry bookkeeping principles to maintain accurate financial records.

## Features

- **Double-Entry Bookkeeping**: Every transaction is recorded as both a debit and credit to maintain the accounting equation
- **Chart of Accounts**: Organize accounts by type (Asset, Liability, Equity, Revenue, Expense)
- **Journal Entries**: Record financial transactions with automatic balance validation
- **Financial Reports**:
  - Balance Sheet: Shows assets, liabilities, and equity at a point in time
  - Income Statement: Shows revenues and expenses for a period
  - Trial Balance: Verifies that debits equal credits across all accounts
- **Period Filtering**: View reports for different time periods (Year-to-Date, Current Month, Custom Dates)
- **Account Management**: Create and manage your chart of accounts

## Project Structure

```
PerFinPy/
├── app/
│   ├── __init__.py          # Application factory
│   ├── models.py            # Database models (Account, JournalEntry, TransactionLine)
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── main.py          # Home and dashboard routes
│   │   ├── transactions.py  # Transaction and account routes
│   │   └── reports.py       # Report generation routes
│   ├── templates/           # HTML templates
│   │   ├── base.html        # Base template with navigation
│   │   ├── index.html       # Home page
│   │   ├── dashboard.html   # Dashboard
│   │   ├── transactions/    # Transaction-related templates
│   │   └── reports/         # Report templates
│   └── static/
│       └── css/
│           └── style.css    # Styling
├── config.py                # Configuration settings
├── run.py                   # Application entry point
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Database Schema

### Accounts
- Stores the chart of accounts
- Fields: code, name, account_type, description, is_active

### Journal Entries
- Header information for each transaction entry
- Fields: entry_date, description, reference, notes

### Transaction Lines
- Individual debit or credit lines
- Fields: account_id, line_type (DEBIT/CREDIT), amount, date, description

## Installation

### Prerequisites
- Python 3.7+
- pip

### Steps

1. **Clone/Create the project**
   ```bash
   cd PerFinPy
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Run the application**
   ```bash
   python run.py
   ```

6. **Open in browser**
   Navigate to `http://127.0.0.1:5000`

### Production

Run with `gunicorn` behind a proper web server (nginx) for production:

```bash
gunicorn wsgi:app --bind 0.0.0.0:8000 --workers 3
```

## Usage

### Creating a Chart of Accounts

1. Navigate to **Chart of Accounts** in the menu
2. Click **New Account**
3. Fill in:
   - Account Code (e.g., 1000, 2000, 3000)
   - Account Name
   - Account Type (Asset, Liability, Equity, Revenue, Expense)
   - Description (optional)

### Recording Transactions

1. Go to **Transactions** > **New Entry**
2. Enter the entry date
3. Add transaction lines:
   - Select account (debit side)
   - Choose Debit or Credit
   - Enter amount
   - Add description (optional)
4. Add multiple lines as needed
5. System automatically validates that debits equal credits
6. Click **Save Entry**

### Viewing Reports

#### Balance Sheet
- Shows your financial position at a specific date
- Equation: Assets = Liabilities + Equity

#### Income Statement
- Shows your profitability over a period
- Equation: Net Income = Revenues - Expenses

#### Trial Balance
- Verifies the integrity of your records
- Debits must equal Credits

## Accounting Concepts

### Double-Entry Bookkeeping
Every transaction affects at least two accounts:
- **Debit**: Increases assets/expenses, decreases liabilities/revenues
- **Credit**: Increases liabilities/revenues, decreases assets/expenses

### Account Types

**Assets**: Resources owned by the business
- Examples: Cash, Bank Account, Inventory

**Liabilities**: Obligations owed by the business
- Examples: Credit Card, Loans, Accounts Payable

**Equity**: Owner's stake in the business
- Examples: Capital, Retained Earnings

**Revenues**: Money earned by the business
- Examples: Sales, Service Income

**Expenses**: Costs incurred by the business
- Examples: Utilities, Rent, Salaries

## Sample Chart of Accounts

```
1000 - Cash
1100 - Bank Account
1200 - Accounts Receivable
1500 - Inventory
2000 - Accounts Payable
2100 - Credit Card
3000 - Owner's Capital
4000 - Sales Revenue
5000 - Salary Expense
5100 - Rent Expense
5200 - Utilities Expense
```

## Common Transactions

### Recording a Bank Deposit
- Debit: Bank Account (Asset)
- Credit: Owner's Capital (Equity)

### Recording a Salary Expense
- Debit: Salary Expense (Expense)
- Credit: Cash (Asset)

### Recording Sales Income
- Debit: Cash (Asset)
- Credit: Sales Revenue (Revenue)

## Tips

1. **Start with a chart of accounts**: Set up all your accounts before recording transactions
2. **Always balance entries**: The system enforces balanced entries
3. **Use meaningful descriptions**: Help yourself understand transactions later
4. **Use references**: Use invoice/check numbers for traceability
5. **Review reports regularly**: Monitor your financial position and performance

## Future Enhancements

- Multi-user support with authentication
- Data export to CSV/PDF
- Budget tracking and variance analysis
- Account reconciliation tools
- Multi-currency support
- Audit trails
- Recurring transactions

## License

MIT License

## Support

For issues or questions, please refer to the Flask and SQLAlchemy documentation:
- Flask: https://flask.palletsprojects.com/
- SQLAlchemy: https://www.sqlalchemy.org/
