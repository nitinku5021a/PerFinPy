import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Account, JournalEntry, TransactionLine
from datetime import date, timedelta

app = create_app()


def test_transactions_filters():
    with app.app_context():
        # Fresh DB
        db_path = os.path.join(os.getcwd(), 'accounting.db')
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        # Create accounts with a parent (group) account
        parent = Account(code='p1', name='Bank Accounts', account_type='Asset')
        db.session.add(parent)
        db.session.commit()
        a1 = Account(code='a1', name='Cash', account_type='Asset', parent_id=parent.id)
        a2 = Account(code='a2', name='Salary', account_type='Income')
        db.session.add_all([a1, a2])
        db.session.commit()

        # Create entries: one today, one last year
        today = date.today()
        last_year = date(today.year - 1, 6, 15)

        je1 = JournalEntry(entry_date=today, description='Today entry', reference='T1')
        tl1 = TransactionLine(journal_entry_id=je1.id if je1.id else 0, account_id=a1.id, line_type='DEBIT', amount=1000.0, date=today)
        tl2 = TransactionLine(journal_entry_id=je1.id if je1.id else 0, account_id=a2.id, line_type='CREDIT', amount=1000.0, date=today)
        db.session.add(je1)
        db.session.flush()
        tl1.journal_entry_id = je1.id
        tl2.journal_entry_id = je1.id
        db.session.add_all([tl1, tl2])

        je2 = JournalEntry(entry_date=last_year, description='Last year', reference='LY1')
        tl3 = TransactionLine(journal_entry_id=je2.id if je2.id else 0, account_id=a1.id, line_type='DEBIT', amount=2000.0, date=last_year)
        tl4 = TransactionLine(journal_entry_id=je2.id if je2.id else 0, account_id=a2.id, line_type='CREDIT', amount=2000.0, date=last_year)
        db.session.add(je2)
        db.session.flush()
        tl3.journal_entry_id = je2.id
        tl4.journal_entry_id = je2.id
        db.session.add_all([tl3, tl4])

        db.session.commit()

        client = app.test_client()

        # 1. Default view (no params) should show current month entries
        resp = client.get('/transactions/')
        assert resp.status_code == 200
        assert b'Today entry' in resp.data
        assert b'Last year' not in resp.data

        # 1b. Edge case: JournalEntry dated today but its transaction lines dated last year should NOT appear
        je3 = JournalEntry(entry_date=today, description='JE with old lines', reference='OLD')
        tl_old = TransactionLine(journal_entry_id=je3.id if je3.id else 0, account_id=a1.id, line_type='DEBIT', amount=500.0, date=last_year)
        tl_old2 = TransactionLine(journal_entry_id=je3.id if je3.id else 0, account_id=a2.id, line_type='CREDIT', amount=500.0, date=last_year)
        db.session.add(je3)
        db.session.flush()
        tl_old.journal_entry_id = je3.id
        tl_old2.journal_entry_id = je3.id
        db.session.add_all([tl_old, tl_old2])
        db.session.commit()

        resp = client.get('/transactions/')
        assert resp.status_code == 200
        assert b'JE with old lines' not in resp.data

        # 2. Filter by current month should return the today entry only
        resp = client.get('/transactions/?period=current_month')
        assert resp.status_code == 200
        assert b'Today entry' in resp.data
        assert b'Last year' not in resp.data

        # 2. Filter by all should return both
        resp = client.get('/transactions/?period=all')
        assert resp.status_code == 200
        assert b'Today entry' in resp.data and b'Last year' in resp.data

        # 3. Filter by account_id (a1) should return entries that include account Cash
        resp = client.get(f'/transactions/?account_id={a1.id}&period=all')
        assert resp.status_code == 200
        assert b'Today entry' in resp.data and b'Last year' in resp.data

        # 4. Filter by parent account should include entries for its descendants (a1)
        resp = client.get(f'/transactions/?account_id={parent.id}&period=all')
        assert resp.status_code == 200
        assert b'Today entry' in resp.data and b'Last year' in resp.data

        # 5. Filter by account_id that has no entries
        a3 = Account(code='a3', name='NoEntry', account_type='Expense')
        db.session.add(a3)
        db.session.commit()
        resp = client.get(f'/transactions/?account_id={a3.id}&period=all')
        assert resp.status_code == 200
        # no entries
        assert b'No journal entries found' in resp.data or b'Today entry' not in resp.data
