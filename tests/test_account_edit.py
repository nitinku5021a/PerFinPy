import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Account, JournalEntry, TransactionLine

app = create_app()


def test_change_account_type_without_transactions():
    with app.app_context():
        db_path = os.path.join(os.getcwd(), 'accounting.db')
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        parent = Account(code='p1', name='Top', account_type='Asset')
        child = Account(code='c1', name='Child', account_type='Asset', parent_id=None)
        db.session.add_all([parent, child])
        db.session.commit()

        client = app.test_client()
        # change child type to Liability (no transactions exist)
        resp = client.post(f'/transactions/accounts/{child.id}/edit', data={
            'name': 'Child',
            'account_type': 'Liability',
            'parent_id': '',
            'description': 'changed'
        }, follow_redirects=True)
        assert resp.status_code == 200
        updated = Account.query.get(child.id)
        assert updated.account_type == 'Liability'


def test_change_account_type_with_transactions_fails():
    with app.app_context():
        db_path = os.path.join(os.getcwd(), 'accounting.db')
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        acc = Account(code='a1', name='A', account_type='Asset')
        db.session.add(acc)
        db.session.commit()

        # create a transaction on acc
        from datetime import date
        je = JournalEntry(entry_date=date(2026, 1, 1), description='t')
        db.session.add(je)
        db.session.flush()
        tl = TransactionLine(journal_entry_id=je.id, account_id=acc.id, line_type='DEBIT', amount=100, date=date(2026,1,1))
        tl2 = TransactionLine(journal_entry_id=je.id, account_id=acc.id, line_type='CREDIT', amount=100, date=date(2026,1,1))
        db.session.add_all([tl, tl2])
        db.session.commit()

        client = app.test_client()
        resp = client.post(f'/transactions/accounts/{acc.id}/edit', data={
            'name': 'A',
            'account_type': 'Liability',
            'parent_id': '',
            'description': ''
        }, follow_redirects=True)
        assert resp.status_code == 200
        assert b'Cannot change account type' in resp.data