import sys, os
sys.path.insert(0, os.getcwd())
from app import create_app, db
from app.models import JournalEntry, TransactionLine

app = create_app()
with app.app_context():
    for je in JournalEntry.query.order_by(JournalEntry.id).all():
        print('JE', je.id, 'date:', je.entry_date, 'desc:', je.description)
        for l in je.transaction_lines:
            print('  ', l.line_type, l.amount, 'account:', l.account.get_path())
