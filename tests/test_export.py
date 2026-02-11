import sys, os, io
from datetime import date
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Account, JournalEntry, TransactionLine, MonthlyBudget, BudgetEntryAssignment
from openpyxl import load_workbook

def test_export_transactions():
    app = create_app()

    with app.app_context():
        # fresh DB
        db_path = os.path.join(os.getcwd(), 'accounting.db')
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        a1 = Account(code='A1', name='Checking', account_type='Asset')
        a2 = Account(code='E1', name='Groceries', account_type='Expense')
        db.session.add_all([a1, a2])
        db.session.commit()

        je = JournalEntry(entry_date=date(2026, 1, 10), description='Grocery Spend')
        db.session.add(je)
        db.session.flush()
        db.session.add_all([
            TransactionLine(journal_entry_id=je.id, account_id=a2.id, line_type='DEBIT', amount=1200.0, date=date(2026, 1, 10)),
            TransactionLine(journal_entry_id=je.id, account_id=a1.id, line_type='CREDIT', amount=1200.0, date=date(2026, 1, 10))
        ])

        mb = MonthlyBudget(
            month=date(2026, 1, 1),
            budget_amount=20000.0,
            guchi_opening_balance=100.0,
            gunu_opening_balance=200.0
        )
        db.session.add(mb)
        db.session.flush()
        db.session.add(BudgetEntryAssignment(month=date(2026, 1, 1), journal_entry_id=je.id, owner='Guchi'))
        db.session.commit()

        client = app.test_client()
        resp = client.get('/transactions/export')
        assert resp.status_code == 200
        data = resp.data
        assert len(data) > 100

        # Load workbook from bytes
        wb = load_workbook(filename=io.BytesIO(data))
        assert 'Transactions' in wb.sheetnames
        ws = wb['Transactions']
        rows = list(ws.rows)
        # header + at least one data row
        assert len(rows) >= 2
        header = [c.value for c in rows[0]]
        assert header == ['Date', 'Debit Account', 'Description', 'Amount', 'Credit Account']

        # Accounts sheet should be present and include Opening Balance
        assert 'Accounts' in wb.sheetnames
        acc_ws = wb['Accounts']
        acc_rows = list(acc_ws.rows)
        assert len(acc_rows) >= 1
        acc_header = [c.value for c in acc_rows[0]]
        assert 'Opening Balance' in acc_header

        # Budget sheets should be present
        assert 'Monthly Budget' in wb.sheetnames
        mb_ws = wb['Monthly Budget']
        mb_rows = list(mb_ws.rows)
        assert len(mb_rows) >= 1
        mb_header = [c.value for c in mb_rows[0]]
        assert mb_header == ['Month', 'Budget Amount', 'Guchi Opening Balance', 'Gunu Opening Balance']

        assert 'Budget Assignments' in wb.sheetnames
        ba_ws = wb['Budget Assignments']
        ba_rows = list(ba_ws.rows)
        assert len(ba_rows) >= 2
        ba_header = [c.value for c in ba_rows[0]]
        assert ba_header == ['Month', 'JE ID', 'Entry Date', 'Description', 'Owner']
        first_assignment = [c.value for c in ba_rows[1]]
        assert first_assignment[0] == '2026-01'
        assert first_assignment[4] == 'Guchi'

        # spot-check a data row
        first_row = [c.value for c in rows[1]]
        assert first_row[0] is not None and first_row[1] is not None and isinstance(first_row[3], (int, float))
        # debit account path should be prefixed by account type (e.g., 'Asset:...')
        from app.models import AccountType
        debit_path = first_row[1]
        assert isinstance(debit_path, str) and ':' in debit_path and debit_path.split(':')[0] in [t.value for t in AccountType]

