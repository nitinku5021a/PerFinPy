import sys
import os

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Account

app = create_app()

with app.app_context():
    client = app.test_client()

    # Create an account
    resp = client.post('/transactions/accounts/new', data={
        'name': 'Cash',
        'account_type': 'Asset',
        'description': 'Cash account'
    }, follow_redirects=True)
    print('Create account status:', resp.status_code)

    # Check accounts list
    resp2 = client.get('/transactions/accounts')
    print('Accounts page status:', resp2.status_code)

    # Create a balanced transaction (debit cash, credit revenue)
    # First ensure we have a revenue account
    resp3 = client.post('/transactions/accounts/new', data={
        'name': 'Sales',
        'account_type': 'Income',
        'description': 'Sales income'
    }, follow_redirects=True)
    print('Create revenue account status:', resp3.status_code)

    # Query accounts to get IDs
    cash = Account.query.filter_by(name='Cash').first()
    sales = Account.query.filter_by(name='Sales').first()
    print('Cash id:', cash.id if cash else None, 'Sales id:', sales.id if sales else None)

    # Post new transaction (simplified form: date, debit, description, amount, credit)
    data = {
        'entry_date': '2026-01-01',
        'description': 'Test sale',
        'debit_account_id': str(cash.id),
        'credit_account_id': str(sales.id),
        'amount': '100.00'
    }

    resp4 = client.post('/transactions/new', data=data, follow_redirects=True)
    print('Create transaction status:', resp4.status_code)
    if resp4.status_code != 200:
        print(resp4.data.decode())
    else:
        print('Transaction created successfully')
