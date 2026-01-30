import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Account

app = create_app()

with app.app_context():
    # Ensure a fresh DB for deterministic tests
    import os
    db_path = 'd:\\Work\\PerFinPy\\accounting.db'
    if os.path.exists(db_path):
        os.remove(db_path)
        print('Deleted old database')
    db.create_all()

    client = app.test_client()

    print("=== Testing Account Grouping & Networth ===\n")

    # 1. Create parent accounts
    print("1. Creating parent accounts...")
    parent_asset = Account(code='p1', name='Bank Accounts', account_type='Asset')
    parent_liab = Account(code='p2', name='Credit Cards', account_type='Liability')
    parent_equity = Account(code='p3', name='Owner Capital', account_type='Equity')
    db.session.add_all([parent_asset, parent_liab, parent_equity])
    db.session.commit()

    # 2. Create child accounts
    print("2. Creating child accounts...")
    child_icici = Account(code='c1', name='ICICI Bank', account_type='Asset', parent_id=parent_asset.id)
    child_idfc = Account(code='c2', name='IDFC Bank', account_type='Asset', parent_id=parent_asset.id)
    child_cc = Account(code='c3', name='HDFC Credit Card', account_type='Liability', parent_id=parent_liab.id)
    # Add a grandchild under ICICI Bank to exercise 2-level display
    grand_icici = Account(code='g1', name='ICICI Savings', account_type='Asset', parent_id=None)
    # we'll set parent after grandchild creation (to ensure ids available)
    db.session.add_all([child_icici, child_idfc, child_cc, grand_icici, ])
    db.session.commit()
    # attach grandchild to child_icici as real grandchild
    grand_icici.parent_id = child_icici.id
    revenue = Account(code='c4', name='Salary', account_type='Revenue')
    db.session.add_all([grand_icici, revenue])
    db.session.commit()

    # 3. Check hierarchy
    print("3. Testing hierarchy methods...")
    print(f"  Parent Asset has children: {parent_asset.is_group()}")
    print(f"  Child ICICI is leaf: {child_icici.is_leaf()}")
    print(f"  Parent children count: {len(parent_asset.children)}")

    # 4. Create balanced transaction
    print("4. Creating balanced transaction...")
    from datetime import datetime
    from app.models import JournalEntry, TransactionLine, JournalEntryEditLog

    entry = JournalEntry(
        entry_date=datetime.now().date(),
        description='Initial deposit',
        reference='DEP001'
    )
    tl_debit = TransactionLine(
        journal_entry_id=entry.id if entry.id else 0,
        account_id=grand_icici.id,
        line_type='DEBIT',
        amount=10000.0,
        date=datetime.now().date()
    )
    tl_credit = TransactionLine(
        journal_entry_id=entry.id if entry.id else 0,
        account_id=revenue.id,
        line_type='CREDIT',
        amount=10000.0,
        date=datetime.now().date()
    )
    db.session.add(entry)
    db.session.flush()
    tl_debit.journal_entry_id = entry.id
    tl_credit.journal_entry_id = entry.id
    db.session.add_all([tl_debit, tl_credit])
    db.session.commit()

    # 4b. Edit the entry via POST to exercise edit log
    print("4b. Editing entry to exercise edit log...")
    client = app.test_client()
    edit_payload = {
        'entry_date': entry.entry_date.strftime('%Y-%m-%d'),
        'description': 'Updated deposit',
        'reference': 'DEP001',
        'notes': 'Edited for test',
        'line_count': '2',
        'line_0_account_id': str(grand_icici.id),
        'line_0_type': 'DEBIT',
        'line_0_amount': '5000',
        'line_0_description': 'half amount',
        'line_1_account_id': str(revenue.id),
        'line_1_type': 'CREDIT',
        'line_1_amount': '5000',
        'line_1_description': 'half amount'
    }

    resp = client.post(f'/transactions/{entry.id}/edit', data=edit_payload, follow_redirects=True)
    print(f"  Edit status: {resp.status_code}")

    # Verify edit log created
    logs = JournalEntryEditLog.query.filter_by(journal_entry_id=entry.id).all()
    if logs:
        print('  ✓ Edit log created')
    else:
        print('  ✗ Edit log missing')

    # 5. Test account list with hierarchy
    print("5. Testing accounts list endpoint...")
    resp = client.get('/transactions/accounts')
    print(f"  Status: {resp.status_code}")
    if b'ICICI Bank' in resp.data and b'ICICI Savings' in resp.data and b'Bank Accounts' in resp.data:
        print("  ✓ Hierarchical display (2 levels) working")
    else:
        print("  ✗ Hierarchy not rendering (missing grandchild or group)")
    # Also check that balances are shown for accounts (expecting 10000.00 on the grandchild)
    if b'10000.00' in resp.data or b'10000' in resp.data:
        print("  ✓ Balances present in chart of accounts")
    else:
        print("  ✗ Balances missing from chart of accounts")

    # 6. Test networth report
    print("6. Testing networth report...")
    resp = client.get('/reports/networth')
    print(f"  Status: {resp.status_code}")
    if resp.status_code == 200:
        if b'Networth Statement' in resp.data:
            print("  ✓ Networth report working")
            if b'ICICI Savings' in resp.data and (b'10000.00' in resp.data or b'10000' in resp.data):
                print("  ✓ Grandchild and balances visible in Networth report")
            else:
                print("  ✗ Networth missing grandchild or balances")
        else:
            print("  ✗ Networth template not found")
    else:
        print(f"  ✗ Error: {resp.data.decode()[:500]}")

    # 7. Test balance-sheet redirect
    print("7. Testing balance-sheet redirect...")
    resp = client.get('/reports/balance-sheet', follow_redirects=False)
    print(f"  Redirect status: {resp.status_code}")
    if resp.status_code == 302:
        print("  ✓ Redirect working")

    # 8. Test trial balance still works
    print("8. Testing trial balance...")
    resp = client.get('/reports/trial-balance')
    print(f"  Status: {resp.status_code}")

    # 9. Test new account form with parent selection
    print("9. Testing new account form...")
    resp = client.get('/transactions/accounts/new')
    if b'parent_id' in resp.data and b'Parent Account' in resp.data:
        print("  ✓ Parent account selection in form")
    else:
        print("  ✗ Parent account field missing")

    print("\n=== All tests completed ===")
