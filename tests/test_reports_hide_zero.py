import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Account


def test_networth_hides_zero_accounts_by_default_and_shows_with_flag():
    app = create_app()
    with app.app_context():
        db_path = os.path.join(os.getcwd(), 'accounting.db')
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        # Zero-only asset
        a_zero = Account(code='A0', name='ZeroAsset', account_type='Asset')
        # Asset with non-zero opening balance (should show)
        a_non = Account(code='A1', name='NonZeroAsset', account_type='Asset', opening_balance=500.0)
        db.session.add_all([a_zero, a_non])
        db.session.commit()

        client = app.test_client()
        # Directly check the built tree
        from app.routes.reports import build_two_level_tree
        assets = Account.query.filter_by(account_type='Asset', parent_id=None).all()
        tree = build_two_level_tree(assets, None, None, show_zero=False)
        assert all(item['account'].name != 'ZeroAsset' for item in tree)

        resp = client.get('/reports/networth')
        body = resp.get_data(as_text=True)
        # Use anchor text inclusive checks to avoid substring collisions
        assert (f'>{"ZeroAsset"}<' not in body)
        assert (f'>{"NonZeroAsset"}<' in body)

        # With show_zero flag, the zero account should appear
        resp2 = client.get('/reports/networth?show_zero=1')
        body2 = resp2.get_data(as_text=True)
        assert (f'>{"ZeroAsset"}<' in body2)


def test_income_statement_hides_zero_accounts_by_default_and_shows_with_flag():
    app = create_app()
    with app.app_context():
        db_path = os.path.join(os.getcwd(), 'accounting.db')
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        # Income group with zero balance
        inc_zero = Account(code='I0', name='ZeroIncome', account_type='Income')
        inc_non = Account(code='I1', name='NonZeroIncome', account_type='Income')
        db.session.add_all([inc_zero, inc_non])
        # Add a child with transaction for NonZeroIncome to create balance
        db.session.commit()

        # Create a journal entry to give NonZeroIncome some balance
        from app.models import JournalEntry, TransactionLine
        from datetime import date
        a = Account.query.filter_by(name='NonZeroIncome').first()
        je = JournalEntry(entry_date=date.today(), description='Test')
        db.session.add(je)
        db.session.flush()
        # Debit some asset to match credit
        asset = Account(code='AS1', name='AssetForIncome', account_type='Asset')
        db.session.add(asset)
        db.session.flush()
        dline = TransactionLine(journal_entry_id=je.id, account_id=asset.id, line_type='DEBIT', amount=100.0, date=date.today())
        cline = TransactionLine(journal_entry_id=je.id, account_id=a.id, line_type='CREDIT', amount=100.0, date=date.today())
        db.session.add_all([dline, cline])
        db.session.commit()

        client = app.test_client()
        resp = client.get('/reports/income-statement')
        body = resp.get_data(as_text=True)
        assert (f'>{"ZeroIncome"}<' not in body)
        assert (f'>{"NonZeroIncome"}<' in body)

        resp2 = client.get('/reports/income-statement?show_zero=1')
        body2 = resp2.get_data(as_text=True)
        assert (f'>{"ZeroIncome"}<' in body2)
