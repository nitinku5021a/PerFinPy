import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import io
from openpyxl import Workbook
from app import create_app, db
from app.models import Account
from app.utils.excel_import import import_transactions_from_excel

app = create_app()


def make_workbook(rows):
    wb = Workbook()
    ws = wb.active
    ws.append(['Date', 'Debit Account', 'Description', 'Amount', 'Credit Account'])
    for r in rows:
        ws.append(r)
    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream


def test_import_does_not_create_type_named_top_level():
    with app.app_context():
        # fresh db
        db_path = 'd:\\Work\\PerFinPy\\accounting.db'
        import os
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        rows = [
            ('01-01-2020', 'Expense:Grocery:Other grocery', 'Test', 100, 'Asset:Saving Bank Account:Cash')
        ]
        stream = make_workbook(rows)
        results = import_transactions_from_excel(stream)
        assert results['success'] == 1

        # There should NOT be a top-level account named 'Expense'
        exp = Account.query.filter_by(name='Expense', parent_id=None).first()
        assert exp is None

        # Instead, top-level should be 'Grocery' with account_type 'Expense'
        gro = Account.query.filter_by(name='Grocery', parent_id=None, account_type='Expense').first()
        assert gro is not None

        # The leaf account 'Other grocery' should exist as child of Grocery
        leaf = Account.query.filter_by(name='Other grocery', parent_id=gro.id, account_type='Expense').first()
        assert leaf is not None