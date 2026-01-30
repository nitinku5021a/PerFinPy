import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Account

app = create_app()


def test_opening_balance_defaults_and_set():
    with app.app_context():
        db_path = os.path.join(os.getcwd(), 'accounting.db')
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        # create account without specifying opening balance -> default 0
        a = Account(code='a1', name='NoOpen', account_type='Asset')
        db.session.add(a)
        db.session.commit()
        a2 = Account.query.get(a.id)
        assert a2.opening_balance == 0.0

        # create via POST with opening balance
        client = app.test_client()
        resp = client.post('/transactions/accounts/new', data={
            'name': 'WithOpen',
            'account_type': 'Asset',
            'parent_id': '',
            'description': 'has open',
            'opening_balance': '1234.50'
        }, follow_redirects=True)
        assert resp.status_code == 200
        created = Account.query.filter_by(name='WithOpen').first()
        assert created is not None
        assert abs(created.opening_balance - 1234.5) < 0.001

        # editing opening balance
        resp2 = client.post(f'/transactions/accounts/{created.id}/edit', data={
            'name': 'WithOpen',
            'account_type': 'Asset',
            'parent_id': '',
            'description': 'updated',
            'opening_balance': '-200.25'
        }, follow_redirects=True)
        assert resp2.status_code == 200
        updated = Account.query.get(created.id)
        assert abs(updated.opening_balance + 200.25) < 0.001

        # opening balance should affect get_balance when no transactions
        assert abs(updated.get_balance() - (-200.25)) < 0.001