import sys
import os
# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Account, AccountType

app = create_app()


def test_account_creation_validation():
    with app.app_context():
        # Fresh DB
        db_path = os.path.join(os.getcwd(), 'accounting.db')
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        client = app.test_client()

        # Create a parent account of type Asset
        parent = Account(code='p1', name='Bank Accounts', account_type='Asset')
        db.session.add(parent)
        db.session.commit()

        # 1) Missing account_type should return an error on the form
        resp = client.post('/transactions/accounts/new', data={
            'name': 'Should Fail'
        })
        assert resp.status_code == 200
        assert b'Account type is required' in resp.data

        # 2) parent type mismatch should return an error
        resp2 = client.post('/transactions/accounts/new', data={
            'name': 'Mismatch',
            'account_type': 'Income',
            'parent_id': str(parent.id)
        })
        assert resp2.status_code == 200
        assert b'Parent account type must match' in resp2.data

        # 3) valid creation with matching parent should succeed
        resp3 = client.post('/transactions/accounts/new', data={
            'name': 'Child Asset',
            'account_type': 'Asset',
            'parent_id': str(parent.id),
            'description': 'child account'
        }, follow_redirects=True)
        assert resp3.status_code == 200
        created = Account.query.filter_by(name='Child Asset').first()
        assert created is not None
        assert created.parent_id == parent.id
        assert created.account_type == 'Asset'