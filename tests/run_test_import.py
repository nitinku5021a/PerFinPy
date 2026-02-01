import sys, os
sys.path.insert(0, os.getcwd())
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

    sample = os.path.join(os.getcwd(), 'test.xlsx')
    if not os.path.exists(sample):
        print('test.xlsx not found at project root: ', sample)
        raise SystemExit(1)

    with open(sample, 'rb') as f:
        res = import_transactions_from_excel(f)
        print('Import results:', res)

    acc = Account.query.first()
    if acc:
        print('\nFound an account:', acc.name, 'id', acc.id)
    else:
        print('\nNo accounts created')
