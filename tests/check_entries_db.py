from app import create_app
from app.models import Account, JournalEntry, TransactionLine
app = create_app()
with app.app_context():
    acc = Account.query.filter_by(name='House Rent').first()
    if not acc:
        print('House Rent not found')
    else:
        print('Account id:', acc.id)
        desc = [a.id for a in acc.get_all_descendants()]
        ids = desc + [acc.id]
        lines = TransactionLine.query.filter(TransactionLine.account_id.in_(ids)).all()
        print('Transaction lines count:', len(lines))
        for l in lines[:10]:
            print(l.date, l.line_type, l.amount, l.journal_entry.description)
