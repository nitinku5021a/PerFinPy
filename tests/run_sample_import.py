from app import create_app, db
from app.utils.excel_import import import_transactions_from_excel
from app.models import Account
import os

app = create_app()
with app.app_context():
    db_path = os.path.join(os.getcwd(), 'accounting.db')
    if os.path.exists(db_path):
        os.remove(db_path)
        print('Deleted old database')
    db.create_all()

    sample = os.path.join(os.getcwd(), 'sample.xlsx')
    if not os.path.exists(sample):
        print('sample.xlsx not found at project root: ', sample)
        raise SystemExit(1)

    with open(sample, 'rb') as f:
        res = import_transactions_from_excel(f)
        print('Import results:', res)

    client = app.test_client()

    for url in ['/reports/networth', '/reports/income-statement', '/reports/trial-balance']:
        resp = client.get(url)
        print('\nURL:', url, 'Status:', resp.status_code)
        snippet = resp.data.decode(errors='ignore')[:1000]
        print('--- snippet ---\n', snippet)

    acc = Account.query.filter_by(account_type='Expense').first()
    if acc:
        print('\nFound expense account:', acc.name, 'id', acc.id)
        resp = client.get(f'/reports/accounts/{acc.id}/entries')
        print('/reports/accounts/{id}/entries status:', resp.status_code)
        print('--- entries snippet ---\n', resp.data.decode()[:1000])
    else:
        print('\nNo expense account found')
