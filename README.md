# PerFinPy - Personal Finance Accounting System

PerFinPy is a personal finance accounting system built with a Flask API and a SvelteKit frontend. It implements double-entry bookkeeping, provides fast financial reports using snapshot tables, and supports Excel import/export.

## Features

- **Double-Entry Bookkeeping**: Every transaction is recorded as both a debit and credit
- **Chart of Accounts**: Organize accounts by type (Asset, Liability, Equity, Income, Expense)
- **Journal Entries**: Record financial transactions with automatic balance validation
- **Financial Reports**:
  - Net Worth Matrix (12-month, drill-down)
  - Income Statement Matrix (12-month, drill-down)
  - Trial Balance
- **Period Filtering**: YTD, Current Month, Custom Dates
- **Account Management**: Create and manage your chart of accounts
- **Fast Reports**: Snapshot tables prevent scanning years of transactions
- **Excel Import/Export**: Batch import transactions and accounts, export filtered or all data

## Project Structure

```
PerFinPy/
+-- app/
¦   +-- __init__.py               # Application factory
¦   +-- models/                   # SQLAlchemy models
¦   +-- routes/                   # Flask API routes
¦   +-- services/                 # Reporting, snapshots, transactions
+-- frontend/                     # SvelteKit UI
+-- backfill_snapshots.py         # One-time snapshot backfill
+-- config.py                     # Configuration settings
+-- run.py                        # Flask dev entry point
+-- requirements.txt              # Python dependencies
+-- README.md
```

## Database Schema (Core)

### Accounts
- Chart of accounts
- Fields: code, name, account_type, description, is_active, opening_balance

### Journal Entries
- Header information for each transaction entry
- Fields: entry_date, description, reference, notes

### Transaction Lines
- Individual debit or credit lines
- Fields: account_id, line_type (DEBIT/CREDIT), amount, date, description

### Snapshot Tables
- `daily_account_balance(date, account_id, balance)`
- `monthly_networth(month, assets, liabilities, networth)`
- `monthly_pnl(month, income, expense, profit)`

## Installation (Dev)

### Prerequisites
- Python 3.9+
- Node.js 18+

### Steps

1. **Create a virtual environment**
   ```bash
   python -m venv venv
   ```

2. **Activate the virtual environment**
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

3. **Install backend dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the backend**
   ```bash
   python run.py
   ```

5. **Run the frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

6. **Open in browser**
   - Frontend: `http://127.0.0.1:5173`

## Production

### Backend (Flask API)
Run with `gunicorn` behind a web server (nginx) for production:

```bash
gunicorn wsgi:app --bind 0.0.0.0:8000 --workers 3
```

### Frontend (SvelteKit)
Build and serve the UI:

```bash
cd frontend
npm install
npm run build
npm run preview -- --host 0.0.0.0 --port 5173
```

In production, serve the built frontend using a proper web server or a Node process manager.

### Environment
Set `DATABASE_URL` to point at your production database, and set a strong `SECRET_KEY`.

## Snapshots

Reports use snapshot tables for performance. If you delete or replace the database, run:

```bash
python backfill_snapshots.py
```

Snapshots are also updated automatically on transaction insert.

## Usage

### Creating a Chart of Accounts

1. Navigate to **Accounts**
2. Create accounts by type (Asset, Liability, Equity, Income, Expense)
3. Use leaf accounts for posting transactions

### Recording Transactions

1. Go to **Transactions**
2. Use the top entry bar:
   - Date is pre-filled
   - Type to search for debit/credit accounts (arrow keys + Enter to select)
   - Enter amount and description
   - Press Enter or click **Add**

### Drill-Down

- Clicking an **account name** opens all-time journal entries for that account.
- Clicking a **Net Worth value** opens entries up to that month.
- Clicking an **Income Statement value** opens entries for that month only.

## Tips

1. Start with a complete chart of accounts
2. Always balance entries (system enforces this)
3. Use meaningful descriptions for transactions
4. Backfill snapshots if you swap the DB

## License

MIT License

## Support

For issues or questions, please refer to the Flask and SQLAlchemy documentation.
