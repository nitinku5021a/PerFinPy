from app.models import Account, JournalEntry


def dashboard_summary():
    total_entries = JournalEntry.query.count()
    total_accounts = Account.query.count()
    return {
        'page': 'dashboard',
        'total_entries': total_entries,
        'total_accounts': total_accounts
    }
