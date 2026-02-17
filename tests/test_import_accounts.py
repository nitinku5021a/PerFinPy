import sys, os, io
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.utils.excel_import import import_transactions_from_excel
from openpyxl import Workbook
from app.models import Account


def test_import_accounts_sheet_sets_opening_balance():
    app = create_app()
    with app.app_context():
        # fresh DB
        db_path = os.path.join(os.getcwd(), 'accounting.db')
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        # Build workbook in-memory with Accounts and Transactions
        wb = Workbook()
        ws = wb.active
        ws.title = 'Transactions'
        ws.append(['Date', 'Debit Account', 'Description', 'Amount', 'Credit Account'])
        # Simple transaction that will use the account defined in Accounts sheet
        ws.append(['01-01-2026', 'Asset:Bank:Checking', 'Initial deposit', '100.00', 'Income:Salary'])

        acc_ws = wb.create_sheet('Accounts')
        acc_ws.append(['Account Path', 'Opening Balance', 'Account Type', 'Code', 'Description'])
        acc_ws.append(['Asset:Bank:Checking', '1234.50', 'Asset', '', 'Checking account'])
        acc_stream = io.BytesIO()
        wb.save(acc_stream)
        acc_stream.seek(0)

        res = import_transactions_from_excel(acc_stream)
        assert res['success'] == 1
        assert not res['errors']

        # Account should exist with opening balance set
        acc = Account.query.filter_by(name='Checking').first()
        assert acc is not None
        assert abs(acc.opening_balance - 1234.5) < 0.001
