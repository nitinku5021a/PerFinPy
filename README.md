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
|-- prod.py / prod.cmd / prod.sh
|-- export-excel.py / export-excel.sh
|-- deploy/
|-- scripts/
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
- `PERFINPY_BACKUP_DIR`
- `PERFINPY_BACKUP_KEEP_LATEST`
- `PERFINPY_EXPORT_URL`
- `PERFINPY_EXPORT_RETRIES`
- `PERFINPY_EXPORT_RETRY_DELAY`

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

Use the OS-specific wrapper, or call `python prod.py` directly.

Windows:

```bat
prod.cmd
```

Linux/macOS:

```bash
chmod +x prod.sh export-excel.sh start-perfinpy-prod.sh scripts/install-linux-service.sh
./prod.sh
```

Behavior:
- installs dependencies
- builds frontend
- starts backend with `waitress` on Windows, `gunicorn` on non-Windows
- starts SvelteKit Node server (`node build`)
- auto-selects alternative backend/frontend ports if requested ports are in use

### Ubuntu / Oracle Cloud systemd

The repo includes a systemd installer for an Ubuntu VM:

```bash
cd /opt/perfinpy
chmod +x scripts/install-linux-service.sh
./scripts/install-linux-service.sh
sudo nano /etc/perfinpy/perfinpy.env
sudo systemctl start perfinpy
sudo journalctl -u perfinpy -f
```

For a private Tailscale deployment:

1. Install and authenticate Tailscale on the VM. Official docs: https://tailscale.com/docs/install/linux
2. Keep Oracle Cloud public ingress closed for app ports `5173` and `8000`; Oracle security-list rules control traffic into the VNIC: https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/update-securitylist.htm
3. Access the app from machines in your tailnet using the VM Tailscale DNS name or IP, for example `http://perfinpy-oracle:5173`.
4. In `/etc/perfinpy/perfinpy.env`, set `SECRET_KEY`, confirm `DATABASE_URL`, and leave `API_BASE_URL=http://127.0.0.1:8000` unless the backend is moved.

### Windows startup

To keep using Windows startup for the local production app, point Task Scheduler or the Startup folder to:

```bat
start-perfinpy-prod.bat
```

The batch file is now path-relative, so it no longer assumes `D:\Production\PerFinPy`.

### Windows startup backup from Oracle Cloud over Tailscale

Set the remote export URL to the Oracle VM's Tailscale address and install the logon task:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install-windows-startup-export-task.ps1 `
  -BackupDir "$env:USERPROFILE\Documents\PerFinPyBackups" `
  -KeepLatest 5 `
  -ExportUrl "http://perfinpy-oracle:5173/api/transactions/export?period=all"
```

The task runs at Windows logon after a short delay. `export-excel.py` also retries remote downloads, which gives Tailscale time to connect during startup.

Manual backup:

```bat
set PERFINPY_EXPORT_URL=http://perfinpy-oracle:5173/api/transactions/export?period=all
startup-export-excel.bat
```

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
