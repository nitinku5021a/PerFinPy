import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Account, JournalEntry, TransactionLine
from app.utils.excel_import import import_transactions_from_excel
import io
from openpyxl import Workbook

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


def test_import_with_negative_amount():
    with app.app_context():
        db_path = os.path.join(os.getcwd(), 'accounting.db')
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        # create accounts to avoid auto-creation interfering
        parent = Account(code='p1', name='Bank Accounts', account_type='Asset')
        db.session.add(parent)
        db.session.commit()

        rows = [
            ('01-01-2020', 'Asset:Saving Bank Account:Cash', 'Refund', -100.0, 'Income:Sales')
        ]
        stream = make_workbook(rows)
        res = import_transactions_from_excel(stream)
        assert res['success'] == 1

        # Check the created journal entry lines: negative amount should flip debit/credit
        je = TransactionLine.query.join(JournalEntry).first().journal_entry
        lines = je.transaction_lines
        # There should be 2 lines with positive amounts
        assert len(lines) == 2
        amounts = sorted([l.amount for l in lines])
        assert amounts == [100.0, 100.0]
        types = sorted([l.line_type for l in lines])
        assert 'DEBIT' in types and 'CREDIT' in types


def test_web_entry_negative_amount():
    with app.app_context():
        db_path = os.path.join(os.getcwd(), 'accounting.db')
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        a1 = Account(code='a1', name='Cash', account_type='Asset')
        a2 = Account(code='a2', name='Sales', account_type='Income')
        db.session.add_all([a1, a2])
        db.session.commit()

        client = app.test_client()
        data = {
            'entry_date': '2026-01-01',
            'description': 'Negative amount test',
            'reference': '',
            'notes': '',
            'line_count': '2',
            'line_0_account_id': str(a1.id),
            'line_0_type': 'DEBIT',
            'line_0_amount': '-500',
            'line_0_description': 'Negative debit',
            'line_1_account_id': str(a2.id),
            'line_1_type': 'DEBIT',
            'line_1_amount': '500',
            'line_1_description': 'Sale'
        }
        resp = client.post('/transactions/new', data=data, follow_redirects=True)
        assert resp.status_code == 200

        je = JournalEntry.query.filter_by(description='Negative amount test').first()
        assert je is not None
        lines = je.transaction_lines
        assert len(lines) == 2
        # negative debit should have been normalized to CREDIT of 500 on the cash account
        cash_line = [l for l in lines if l.account_id == a1.id][0]
        assert cash_line.amount == 500
        assert cash_line.line_type in ('DEBIT', 'CREDIT')
        # overall balanced
        assert je.is_balanced()