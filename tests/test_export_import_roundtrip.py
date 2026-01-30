import sys, os, io
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Account, JournalEntry


def test_export_import_roundtrip():
    app = create_app()
    with app.app_context():
        # fresh DB
        db_path = os.path.join(os.getcwd(), 'accounting.db')
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        client = app.test_client()
        # Create sample accounts and a journal entry via routes or direct models
        a1 = Account(code='A1', name='Checking', account_type='Asset')
        a2 = Account(code='I1', name='Salary', account_type='Income')
        db.session.add_all([a1, a2])
        db.session.commit()

        from datetime import date as _date
        je = JournalEntry(entry_date=_date(2026, 1, 1), description='Initial')
        db.session.add(je)
        db.session.flush()
        from app.models import TransactionLine
        dline = TransactionLine(journal_entry_id=je.id, account_id=a1.id, line_type='DEBIT', amount=100.0, date=_date(2026, 1, 1))
        cline = TransactionLine(journal_entry_id=je.id, account_id=a2.id, line_type='CREDIT', amount=100.0, date=_date(2026, 1, 1))
        db.session.add_all([dline, cline])
        db.session.commit()

        # Export
        resp = client.get('/transactions/export')
        assert resp.status_code == 200
        data = resp.data
        assert len(data) > 0

        # Wipe DB and recreate
        db.session.remove()
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        # Import the exported bytes
        from io import BytesIO
        from app.utils.excel_import import import_transactions_from_excel
        stream = BytesIO(data)
        res = import_transactions_from_excel(stream)
        assert res['success'] == 1 and not res['errors']
        # Verify JE and accounts recreated
        assert JournalEntry.query.count() == 1
        assert Account.query.filter_by(name='Checking').first() is not None
        assert Account.query.filter_by(name='Salary').first() is not None
