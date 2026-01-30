from flask import Blueprint, render_template, request, redirect, url_for
from datetime import datetime, date
from app.models import Account, TransactionLine, AccountType, JournalEntry

bp = Blueprint('reports', __name__, url_prefix='/reports')

def get_period_dates(period_str):
    """Parse period string and return start_date, end_date"""
    today = date.today()
    
    if period_str == 'all':
        return None, None
    if period_str == 'ytd':
        return date(today.year, 1, 1), today
    elif period_str == 'current_month':
        return date(today.year, today.month, 1), today
    elif period_str.startswith('custom_'):
        parts = period_str.split('_')
        if len(parts) >= 3:
            start = datetime.strptime(parts[1], '%Y%m%d').date()
            end = datetime.strptime(parts[2], '%Y%m%d').date()
            return start, end
    
    return None, None

# ---- Helpers for building two-level account trees ----

def get_roots_for_type(account_type):
    """Return the set of top-level root accounts that contain accounts of the given type."""
    accounts = Account.query.filter_by(account_type=account_type).all()
    roots = {}
    for acc in accounts:
        root = acc
        while root.parent is not None:
            root = root.parent
        roots[root.id] = root
    return list(roots.values())


def build_two_level_tree(parent_accounts, start_date, end_date):
    """Build a two-level tree (parent -> children -> grandchildren) with balances for rendering."""
    accounts_with_balance = []
    for acc in parent_accounts:
        account_data = {
            'account': acc,
            'balance': acc.get_group_balance(start_date, end_date) if acc.is_group() else acc.get_balance(start_date, end_date),
            'children': []
        }
        # Add children and grandchildren
        for child in acc.children:
            child_balance = child.get_group_balance(start_date, end_date) if child.is_group() else child.get_balance(start_date, end_date)
            child_data = {
                'account': child,
                'balance': child_balance,
                'children': []
            }
            for grandchild in child.children:
                gc_balance = grandchild.get_group_balance(start_date, end_date) if grandchild.is_group() else grandchild.get_balance(start_date, end_date)
                gc_data = {
                    'account': grandchild,
                    'balance': gc_balance
                }
                child_data['children'].append(gc_data)
            account_data['children'].append(child_data)
        accounts_with_balance.append(account_data)
    return accounts_with_balance


@bp.route('/networth')
def networth():
    """Networth Report (Personal Finance Balance Sheet) - Side by side layout"""
    period = request.args.get('period', 'all')
    start_date, end_date = get_period_dates(period)
    
    # Get root accounts (parent_id is None) for Assets, Liabilities, Equity
    assets = Account.query.filter_by(account_type='Asset', parent_id=None).all()
    liabilities = Account.query.filter_by(account_type='Liability', parent_id=None).all()
    equity = Account.query.filter_by(account_type='Equity', parent_id=None).all()
    
    # Build two-level trees for display
    asset_accounts = build_two_level_tree(assets, start_date, end_date)
    liability_accounts = build_two_level_tree(liabilities, start_date, end_date)
    equity_accounts = build_two_level_tree(equity, start_date, end_date)
    
    # Calculate totals
    total_assets = sum(acc['balance'] for acc in asset_accounts)
    total_liabilities = sum(acc['balance'] for acc in liability_accounts)
    total_equity = sum(acc['balance'] for acc in equity_accounts)
    net_income = get_net_income(start_date, end_date)
    total_equity += net_income
    
    return render_template('reports/networth.html',
                         asset_accounts=asset_accounts,
                         liability_accounts=liability_accounts,
                         equity_accounts=equity_accounts,
                         total_assets=total_assets,
                         total_liabilities=total_liabilities,
                         total_equity=total_equity,
                         net_income=net_income,
                         start_date=start_date,
                         end_date=end_date,
                         period=period,
                         abs=abs)

@bp.route('/balance-sheet')
def balance_sheet():
    """Balance Sheet Report (Legacy - redirects to networth)"""
    period = request.args.get('period', 'all')
    return redirect(url_for('reports.networth', period=period))

@bp.route('/income-statement')
def income_statement():
    """Income Statement Report"""
    # Default to current month as requested
    period = request.args.get('period', 'current_month')
    start_date, end_date = get_period_dates(period)

    # Build two-level trees for Revenue and Expense roots
    revenue_roots = get_roots_for_type('Revenue')
    expense_roots = get_roots_for_type('Expense')

    revenue_accounts = build_two_level_tree(revenue_roots, start_date, end_date)
    expense_accounts = build_two_level_tree(expense_roots, start_date, end_date)

    # Totals: revenues are typically credit (use absolute value), expenses are debit
    total_revenue = sum(abs(item['balance']) for item in revenue_accounts)
    total_expenses = sum(item['balance'] for item in expense_accounts)

    net_income = total_revenue - total_expenses

    return render_template('reports/income_statement.html',
                         revenue_accounts=revenue_accounts,
                         expense_accounts=expense_accounts,
                         total_revenue=total_revenue,
                         total_expenses=total_expenses,
                         net_income=net_income,
                         start_date=start_date,
                         end_date=end_date,
                         period=period)

def get_net_income(start_date=None, end_date=None):
    """Calculate net income for a period"""
    revenues = Account.query.filter_by(account_type='Revenue').all()
    expenses = Account.query.filter_by(account_type='Expense').all()
    
    total_revenue = 0
    for acc in revenues:
        total_revenue += abs(acc.get_balance(start_date, end_date))
    
    total_expenses = 0
    for acc in expenses:
        total_expenses += acc.get_balance(start_date, end_date)
    
    return total_revenue - total_expenses

@bp.route('/trial-balance')
def trial_balance():
    """Trial Balance Report"""
    period = request.args.get('period', 'all')
    start_date, end_date = get_period_dates(period)
    
    accounts = Account.query.filter_by(is_active=True).order_by(Account.name).all()
    
    account_balances = []
    total_debits = 0
    total_credits = 0
    
    for acc in accounts:
        balance = acc.get_balance(start_date, end_date)
        if balance != 0:
            if balance > 0:
                total_debits += balance
            else:
                total_credits += abs(balance)
            
            account_balances.append({
                'account': acc,
                'balance': abs(balance),
                'type': 'Debit' if balance > 0 else 'Credit'
            })
    
    return render_template('reports/trial_balance.html',
                         account_balances=account_balances,
                         total_debits=total_debits,
                         total_credits=total_credits,
                         start_date=start_date,
                         end_date=end_date,
                         period=period,
                         abs=abs)

@bp.route('/accounts/<int:account_id>/entries')
def account_entries(account_id):
    """Drill-down: show journal entries for an account (including descendants)"""
    period = request.args.get('period', 'ytd')
    start_date, end_date = get_period_dates(period)

    account = Account.query.get_or_404(account_id)
    descendant_ids = [a.id for a in account.get_all_descendants()] + [account.id]

    q = JournalEntry.query.join(TransactionLine).filter(TransactionLine.account_id.in_(descendant_ids))
    if start_date:
        q = q.filter(TransactionLine.date >= start_date)
    if end_date:
        q = q.filter(TransactionLine.date <= end_date)

    # Use distinct to avoid duplicate journal entries if multiple lines match
    entries = q.distinct().order_by(JournalEntry.entry_date.desc()).all()

    return render_template('reports/account_entries.html', account=account, entries=entries, period=period, start_date=start_date, end_date=end_date)

