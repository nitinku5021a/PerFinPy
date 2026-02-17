# PerFinPy

PerFinPy is a personal finance app with a Flask JSON API backend and a SvelteKit frontend.
It uses double-entry bookkeeping, snapshot tables for fast reporting, monthly budget allocation, and recurring reminders.

## Tech Stack

- Backend: Flask, Flask-SQLAlchemy, SQLAlchemy, openpyxl
- Frontend: SvelteKit, Svelte 4, Vite, Tailwind
- Database: SQLite by default (`accounting.db`), configurable via `DATABASE_URL`

## Current Functional Scope

### Accounting
- Double-entry transaction capture (debit + credit)
- Chart of accounts with hierarchy (group/leaf accounts)
- Account opening balances
- Journal entry edit logging
- Account-level drill-down from reports

### Reporting
- Dashboard summary
- Net worth matrix
- Income statement matrix
- Trial balance
- Expense/Income/Asset rollups
- Net worth growth and net savings series
- Investment flow reports
- Cashflow Sankey dataset endpoint

### Monthly Budget
- Month-wise budget settings
- Owner assignment per entry (`Guchi`, `Gunu`, `None`)
- Summary metrics and carry-forward behavior

### Reminders
- Recurring monthly reminder tasks
- Auto-generation of current-month occurrences
- Due-day fallback to month end (e.g., 31 -> Feb 28/29)
- Mark done for current month occurrence
- Remove only current-month occurrence
- Delete recurring task entirely

### Excel Import/Export
- Import and export transactions
- Import and export accounts and opening balances
- Import and export monthly budget and budget assignments
- Import and export reminder tasks and occurrences

## Project Structure

```text
PerFinPy/
|-- app/
|   |-- __init__.py
|   |-- models/
|   |-- routes/
|   |-- services/
|   `-- utils/
|-- frontend/
|-- tests/
|-- run.py
|-- wsgi.py
|-- requirements.txt
|-- dev.cmd / dev.ps1
|-- prod.cmd / prod.ps1
`-- README.md
```

## Key API Routes

### Core
- `GET /` -> index payload
- `GET /dashboard` -> dashboard summary

### Transactions and Accounts
- `GET /transactions`
- `POST /transactions/new`
- `GET /transactions/<id>`
- `POST /transactions/<id>/edit`
- `GET /transactions/accounts`
- `POST /transactions/accounts/new`
- `POST /transactions/accounts/<id>/edit`
- `POST /transactions/import`
- `GET /transactions/export`

### Reports
- `GET /reports/networth`
- `GET /reports/networth-matrix`
- `GET /reports/income-matrix`
- `GET /reports/income-statement`
- `GET /reports/trial-balance`
- `GET /reports/networth-growth`
- `GET /reports/net-savings-series`
- `GET /reports/networth-monthly`
- `GET /reports/expense-income-asset`
- `GET /reports/investment-flows`
- `GET /reports/cashflow-sankey`
- `GET /reports/accounts/<account_id>/entries`

### Monthly Budget
- `GET /budget/monthly`
- `POST /budget/monthly/settings`
- `POST /budget/monthly/assign-owner`

### Reminders
- `GET /reminders/monthly`
- `POST /reminders/tasks`
- `POST /reminders/occurrences/<occurrence_id>/done`
- `DELETE /reminders/occurrences/<occurrence_id>`
- `DELETE /reminders/tasks/<task_id>`

## Frontend Pages

Navigation currently includes:
- Dashboard
- Accounts
- Ledger
- Net Worth
- Investments
- Monthly Budget
- Report
- Wealth Report
- Income Statement
- Trial Balance
- Journal Entries
- Transactions
- Reminders

## Database Models (High Level)

- `accounts`
- `journal_entries`
- `journal_entry_edit_logs`
- `transaction_lines`
- `daily_account_balance`
- `monthly_networth`
- `monthly_pnl`
- `monthly_budget`
- `budget_line_assignment`
- `budget_entry_assignment`
- `reminder_task`
- `reminder_occurrence`

## Environment Variables

See `.env.example`.

Required:
- `DATABASE_URL`
- `SECRET_KEY`

Optional:
- `APP_NAME`
- `DEFAULT_CURRENCY`
- `BACKEND_HOST`
- `BACKEND_PORT`
- `FRONTEND_HOST`
- `FRONTEND_PORT`
- `API_BASE_URL`

## Local Development

### Option 1: One-command (Windows)

```bat
dev.cmd
```

This will:
- create virtual environment if needed
- install backend/frontend dependencies
- start Flask backend (`run.py`) and Svelte dev server

### Option 2: Manual

1. Create venv:
```bash
python -m venv venv
```
2. Activate venv:
```bash
venv\Scripts\activate
```
3. Install backend deps:
```bash
pip install -r requirements.txt
```
4. Start backend:
```bash
python run.py
```
5. Start frontend:
```bash
cd frontend
npm install
npm run dev
```

## Production

Use:

```bat
prod.cmd
```

Behavior:
- installs dependencies
- builds frontend
- starts backend with `waitress` on Windows, `gunicorn` on non-Windows
- starts SvelteKit Node server (`node build`)
- auto-selects alternative backend/frontend ports if requested ports are in use

## Snapshots

The app uses snapshot tables for reporting performance.
If needed, backfill snapshots with:

```bash
python backfill_snapshots.py
```

## Excel Workbook Compatibility

### Export includes sheets
- `Transactions`
- `Complex Entries`
- `Accounts`
- `Monthly Budget`
- `Budget Assignments`
- `Reminders Tasks`
- `Reminder Occurrences`

### Import behavior
- Reads known sheets if present
- Upserts monthly budget and budget assignments
- Upserts reminder tasks and reminder occurrences
- Creates missing accounts from account paths
- Reports row-level errors/warnings in import result

## Notes

- Default DB file is `accounting.db` at repo root when `DATABASE_URL` is not set.
- Backend exposes JSON routes; frontend proxies via `/api/*` through SvelteKit.

## License

MIT
