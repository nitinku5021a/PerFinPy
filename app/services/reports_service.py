from datetime import datetime, date
from app.models import Account, TransactionLine, JournalEntry, DailyAccountBalance
from app.services.serialization import account_to_dict, entry_to_dict, isoformat_or_none, tree_to_dict
from app.services import snapshots_service
from sqlalchemy import func, case


def get_period_dates(period_str):
    """Parse period string and return start_date, end_date"""
    today = date.today()

    if period_str == 'all':
        return None, None
    if period_str == 'ytd':
        return date(today.year, 1, 1), today
    if period_str == 'current_month':
        return date(today.year, today.month, 1), today
    if period_str and period_str.startswith('custom_'):
        parts = period_str.split('_')
        if len(parts) >= 3:
            start = datetime.strptime(parts[1], '%Y%m%d').date()
            end = datetime.strptime(parts[2], '%Y%m%d').date()
            return start, end

    return None, None


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


def build_two_level_tree(parent_accounts, start_date, end_date, show_zero=False, tol=0.005, balance_map=None):
    """Build a two-level tree (parent -> children -> grandchildren) with balances for rendering.

    If show_zero is False (default), accounts with balances whose absolute value <= tol will be omitted.
    Parents are omitted only if they and all their descendants are effectively zero.
    """
    if balance_map is None:
        all_accounts = snapshots_service._collect_accounts(parent_accounts)
        balance_map = snapshots_service.get_balances_for_accounts(all_accounts, start_date, end_date)

    accounts_with_balance = []
    for acc in parent_accounts:
        parent_balance = snapshots_service.get_group_balance(acc, balance_map) if acc.is_group() else balance_map.get(acc.id, 0.0)
        account_data = {
            'account': acc,
            'balance': parent_balance,
            'children': []
        }
        for child in acc.children:
            child_balance = snapshots_service.get_group_balance(child, balance_map) if child.is_group() else balance_map.get(child.id, 0.0)
            child_data = {
                'account': child,
                'balance': child_balance,
                'children': []
            }
            for grandchild in child.children:
                gc_balance = snapshots_service.get_group_balance(grandchild, balance_map) if grandchild.is_group() else balance_map.get(grandchild.id, 0.0)
                if not show_zero and abs(gc_balance) <= tol:
                    continue
                gc_data = {
                    'account': grandchild,
                    'balance': gc_balance
                }
                child_data['children'].append(gc_data)
            if not show_zero and abs(child_balance) <= tol and len(child_data['children']) == 0:
                continue
            account_data['children'].append(child_data)
        if not show_zero and abs(parent_balance) <= tol and len(account_data['children']) == 0:
            continue
        accounts_with_balance.append(account_data)
    return accounts_with_balance


def _sum_opening_balance_for_roots(roots):
    """Sum ledger opening_balance for given roots and all their descendants (stated in ledger only)."""
    total = 0.0
    for acc in roots:
        total += (acc.opening_balance or 0.0)
        for child in acc.children:
            total += (child.opening_balance or 0.0)
            for gc in child.children:
                total += (gc.opening_balance or 0.0)
    return total


def _sum_balance_for_roots(roots, balance_map):
    """Sum balance for ALL accounts under given roots (for accurate totals, independent of show_zero)."""
    total = 0.0
    for acc in roots:
        total += snapshots_service.get_group_balance(acc, balance_map) if acc.is_group() else balance_map.get(acc.id, 0.0)
    return total


def get_net_income(start_date=None, end_date=None):
    """Calculate net income for a period"""
    incomes = Account.query.filter_by(account_type='Income').all()
    expenses = Account.query.filter_by(account_type='Expense').all()

    balance_map = snapshots_service.get_balances_for_accounts(
        incomes + expenses,
        start_date,
        end_date
    )

    total_income = 0
    for acc in incomes:
        total_income += abs(balance_map.get(acc.id, 0.0))

    total_expenses = 0
    for acc in expenses:
        total_expenses += balance_map.get(acc.id, 0.0)

    return total_income - total_expenses


def networth_report(period, show_zero):
    start_date, end_date = get_period_dates(period)

    assets = Account.query.filter_by(account_type='Asset', parent_id=None).all()
    liabilities = Account.query.filter_by(account_type='Liability', parent_id=None).all()
    equity = Account.query.filter_by(account_type='Equity', parent_id=None).all()

    all_accounts = Account.query.filter(Account.account_type.in_(['Asset', 'Liability', 'Equity'])).all()
    balance_map = snapshots_service.get_balances_for_accounts(all_accounts, start_date, end_date)

    asset_accounts = build_two_level_tree(assets, start_date, end_date, show_zero=show_zero, balance_map=balance_map)
    liability_accounts = build_two_level_tree(liabilities, start_date, end_date, show_zero=show_zero, balance_map=balance_map)
    equity_accounts = build_two_level_tree(equity, start_date, end_date, show_zero=show_zero, balance_map=balance_map)

    total_assets = _sum_balance_for_roots(assets, balance_map)
    total_liabilities = _sum_balance_for_roots(liabilities, balance_map)
    total_equity_before_carry = _sum_balance_for_roots(equity, balance_map)
    net_income = get_net_income(start_date, end_date)
    total_equity_before_carry += net_income

    opening_balance_ledger = _sum_opening_balance_for_roots(equity)
    carry_forward = total_assets - (total_liabilities + total_equity_before_carry)
    total_equity = total_equity_before_carry + carry_forward

    return {
        'report': 'networth',
        'asset_accounts': tree_to_dict(asset_accounts),
        'liability_accounts': tree_to_dict(liability_accounts),
        'equity_accounts': tree_to_dict(equity_accounts),
        'total_assets': total_assets,
        'total_liabilities': total_liabilities,
        'total_equity': total_equity,
        'net_income': net_income,
        'opening_balance_ledger': opening_balance_ledger,
        'carry_forward': carry_forward,
        'start_date': isoformat_or_none(start_date),
        'end_date': isoformat_or_none(end_date),
        'period': period,
        'show_zero': show_zero
    }


def income_statement_report(period, show_zero):
    start_date, end_date = get_period_dates(period)

    income_roots = get_roots_for_type('Income')
    expense_roots = get_roots_for_type('Expense')

    all_accounts = Account.query.filter(Account.account_type.in_(['Income', 'Expense'])).all()
    balance_map = snapshots_service.get_balances_for_accounts(all_accounts, start_date, end_date)

    income_accounts = build_two_level_tree(income_roots, start_date, end_date, show_zero=show_zero, balance_map=balance_map)
    expense_accounts = build_two_level_tree(expense_roots, start_date, end_date, show_zero=show_zero, balance_map=balance_map)

    total_income = sum(abs(item['balance']) for item in income_accounts)
    total_expenses = sum(item['balance'] for item in expense_accounts)
    net_income = total_income - total_expenses

    return {
        'report': 'income_statement',
        'income_accounts': tree_to_dict(income_accounts),
        'expense_accounts': tree_to_dict(expense_accounts),
        'total_income': total_income,
        'total_expenses': total_expenses,
        'net_income': net_income,
        'start_date': isoformat_or_none(start_date),
        'end_date': isoformat_or_none(end_date),
        'period': period,
        'show_zero': show_zero
    }


def trial_balance_report(period):
    start_date, end_date = get_period_dates(period)

    accounts = Account.query.filter_by(is_active=True).order_by(Account.name).all()
    balance_map = snapshots_service.get_balances_for_accounts(accounts, start_date, end_date)
    account_balances = []
    total_debits = 0
    total_credits = 0

    for acc in accounts:
        balance = balance_map.get(acc.id, 0.0)
        if balance != 0:
            if balance > 0:
                total_debits += balance
            else:
                total_credits += abs(balance)

            account_balances.append({
                'account': account_to_dict(acc),
                'balance': abs(balance),
                'type': 'Debit' if balance > 0 else 'Credit'
            })

    return {
        'report': 'trial_balance',
        'account_balances': account_balances,
        'total_debits': total_debits,
        'total_credits': total_credits,
        'start_date': isoformat_or_none(start_date),
        'end_date': isoformat_or_none(end_date),
        'period': period
    }


def account_entries_report(account_id, period):
    start_date, end_date = get_period_dates(period)

    account = Account.query.get_or_404(account_id)
    descendant_ids = [a.id for a in account.get_all_descendants()] + [account.id]

    q = JournalEntry.query.join(TransactionLine).filter(TransactionLine.account_id.in_(descendant_ids))
    if start_date:
        q = q.filter(TransactionLine.date >= start_date)
    if end_date:
        q = q.filter(TransactionLine.date <= end_date)

    entries = q.distinct().order_by(JournalEntry.entry_date.desc()).all()

    return {
        'report': 'account_entries',
        'account': account_to_dict(account),
        'entries': [entry_to_dict(e) for e in entries],
        'period': period,
        'start_date': isoformat_or_none(start_date),
        'end_date': isoformat_or_none(end_date)
    }


def _add_months(d, delta):
    y = d.year + ((d.month - 1 + delta) // 12)
    m = ((d.month - 1 + delta) % 12) + 1
    return date(y, m, 1)


def networth_matrix_report(start_month_str=None):
    today = date.today()
    max_date = DailyAccountBalance.query.with_entities(func.max(DailyAccountBalance.date)).scalar()
    min_date = DailyAccountBalance.query.with_entities(func.min(DailyAccountBalance.date)).scalar()
    max_month = date.today()
    min_month = date.today()
    if max_date:
        max_month = date(max_date.year, max_date.month, 1)
    if min_date:
        min_month = date(min_date.year, min_date.month, 1)

    start_month = date(today.year, today.month, 1)
    if start_month_str:
        try:
            parsed = datetime.strptime(start_month_str, '%Y-%m').date()
            start_month = date(parsed.year, parsed.month, 1)
        except Exception:
            start_month = date(today.year, today.month, 1)

    if start_month > max_month:
        start_month = max_month
    if start_month < min_month:
        start_month = min_month

    months = [_add_months(start_month, -i) for i in range(0, 12)]
    month_keys = [m.strftime('%Y-%m') for m in months]

    account_types = ['Asset', 'Liability', 'Equity']
    accounts = Account.query.filter(Account.account_type.in_(account_types)).all()
    account_ids = [a.id for a in accounts]
    opening_by_id = {a.id: (a.opening_balance or 0.0) for a in accounts}
    name_by_id = {a.id: (a.get_path() or a.name) for a in accounts}
    type_by_id = {a.id: a.account_type for a in accounts}

    balances_by_month = {}
    for idx, month in enumerate(months):
        month_end = snapshots_service.month_end(month)
        rows = (
            DailyAccountBalance.query.with_entities(
                DailyAccountBalance.account_id,
                func.coalesce(func.sum(DailyAccountBalance.balance), 0.0)
            )
            .filter(DailyAccountBalance.account_id.in_(account_ids))
            .filter(DailyAccountBalance.date <= month_end)
            .group_by(DailyAccountBalance.account_id)
            .all()
        )
        sums = {row[0]: row[1] for row in rows}
        key = month_keys[idx]
        balances_by_month[key] = {
            acc_id: opening_by_id.get(acc_id, 0.0) + sums.get(acc_id, 0.0)
            for acc_id in account_ids
        }

    groups = []
    label_map = {
        'Asset': 'Assets',
        'Liability': 'Liabilities',
        'Equity': 'Equity'
    }
    for account_type in account_types:
        roots = Account.query.filter_by(account_type=account_type, parent_id=None).all()
        group_payload = {
            'group': label_map.get(account_type, f"{account_type}s"),
            'parents': [],
            'monthly_balances': {}
        }

        for root in sorted(roots, key=lambda a: name_by_id[a.id].lower()):
            descendants = root.get_all_descendants()
            leaf_accounts = descendants if descendants else [root]
            parent_payload = {
                'name': name_by_id[root.id],
                'account_id': root.id,
                'accounts': [],
                'monthly_balances': {}
            }

            for acc in sorted(leaf_accounts, key=lambda a: name_by_id[a.id].lower()):
                acc_monthly = {
                    m: balances_by_month[m].get(acc.id, opening_by_id.get(acc.id, 0.0))
                    for m in month_keys
                }
                parent_payload['accounts'].append({
                    'name': name_by_id[acc.id].split(':')[-1],
                    'account_id': acc.id,
                    'monthly_balances': acc_monthly
                })

            for m in month_keys:
                ids = [root.id] + [a.id for a in descendants]
                parent_payload['monthly_balances'][m] = sum(
                    balances_by_month[m].get(aid, opening_by_id.get(aid, 0.0))
                    for aid in ids
                )

            group_payload['parents'].append(parent_payload)

        for m in month_keys:
            group_payload['monthly_balances'][m] = sum(
                p['monthly_balances'][m] for p in group_payload['parents']
            )

        groups.append(group_payload)

    has_older = _add_months(start_month, -11) > min_month
    has_newer = start_month < max_month

    return {
        'start_month': start_month.strftime('%Y-%m'),
        'months': month_keys,
        'has_older': has_older,
        'has_newer': has_newer,
        'groups': groups
    }


def income_matrix_report(start_month_str=None):
    today = date.today()
    max_date = DailyAccountBalance.query.with_entities(func.max(DailyAccountBalance.date)).scalar()
    min_date = DailyAccountBalance.query.with_entities(func.min(DailyAccountBalance.date)).scalar()
    max_month = date(today.year, today.month, 1)
    min_month = date(today.year, today.month, 1)
    if max_date:
        max_month = date(max_date.year, max_date.month, 1)
    if min_date:
        min_month = date(min_date.year, min_date.month, 1)

    start_month = date(today.year, today.month, 1)
    if start_month_str:
        try:
            parsed = datetime.strptime(start_month_str, '%Y-%m').date()
            start_month = date(parsed.year, parsed.month, 1)
        except Exception:
            start_month = date(today.year, today.month, 1)

    if start_month > max_month:
        start_month = max_month
    if start_month < min_month:
        start_month = min_month

    months = [_add_months(start_month, -i) for i in range(0, 12)]
    month_keys = [m.strftime('%Y-%m') for m in months]

    account_types = ['Income', 'Expense']
    accounts = Account.query.filter(Account.account_type.in_(account_types)).all()
    account_ids = [a.id for a in accounts]
    name_by_id = {a.id: (a.get_path() or a.name) for a in accounts}
    type_by_id = {a.id: a.account_type for a in accounts}

    balances_by_month = {}
    for idx, month in enumerate(months):
        month_start = date(month.year, month.month, 1)
        month_end = snapshots_service.month_end(month)
        rows = (
            DailyAccountBalance.query.with_entities(
                DailyAccountBalance.account_id,
                func.coalesce(func.sum(DailyAccountBalance.balance), 0.0)
            )
            .filter(DailyAccountBalance.account_id.in_(account_ids))
            .filter(DailyAccountBalance.date >= month_start)
            .filter(DailyAccountBalance.date <= month_end)
            .group_by(DailyAccountBalance.account_id)
            .all()
        )
        sums = {row[0]: row[1] for row in rows}
        key = month_keys[idx]
        balances_by_month[key] = {acc_id: sums.get(acc_id, 0.0) for acc_id in account_ids}

    groups = []
    for account_type in account_types:
        roots = Account.query.filter_by(account_type=account_type, parent_id=None).all()
        group_payload = {
            'group': f"{account_type}",
            'parents': [],
            'monthly_balances': {}
        }

        for root in sorted(roots, key=lambda a: name_by_id[a.id].lower()):
            descendants = root.get_all_descendants()
            leaf_accounts = descendants if descendants else [root]
            parent_payload = {
                'name': name_by_id[root.id],
                'account_id': root.id,
                'accounts': [],
                'monthly_balances': {}
            }

            for acc in sorted(leaf_accounts, key=lambda a: name_by_id[a.id].lower()):
                acc_monthly = {}
                for m in month_keys:
                    val = balances_by_month[m].get(acc.id, 0.0)
                    if type_by_id[acc.id] == 'Income':
                        val = abs(val)
                    acc_monthly[m] = val
                parent_payload['accounts'].append({
                    'name': name_by_id[acc.id].split(':')[-1],
                    'account_id': acc.id,
                    'monthly_balances': acc_monthly
                })

            for m in month_keys:
                ids = [root.id] + [a.id for a in descendants]
                total = 0.0
                for aid in ids:
                    val = balances_by_month[m].get(aid, 0.0)
                    if type_by_id.get(aid) == 'Income':
                        val = abs(val)
                    total += val
                parent_payload['monthly_balances'][m] = total

            group_payload['parents'].append(parent_payload)

        for m in month_keys:
            group_payload['monthly_balances'][m] = sum(
                p['monthly_balances'][m] for p in group_payload['parents']
            )

        groups.append(group_payload)

    has_older = _add_months(start_month, -11) > min_month
    has_newer = start_month < max_month

    return {
        'start_month': start_month.strftime('%Y-%m'),
        'months': month_keys,
        'has_older': has_older,
        'has_newer': has_newer,
        'groups': groups
    }


def _months_between(min_month, max_month):
    months = []
    cursor = date(min_month.year, min_month.month, 1)
    end = date(max_month.year, max_month.month, 1)
    while cursor <= end:
        months.append(cursor)
        cursor = _add_months(cursor, 1)
    return months


def networth_growth_report():
    max_date = DailyAccountBalance.query.with_entities(func.max(DailyAccountBalance.date)).scalar()
    min_date = DailyAccountBalance.query.with_entities(func.min(DailyAccountBalance.date)).scalar()
    if not max_date or not min_date:
        return {'yearly': []}

    min_month = date(min_date.year, min_date.month, 1)
    max_month = date(max_date.year, max_date.month, 1)

    accounts = Account.query.filter(Account.account_type.in_(['Asset', 'Liability'])).all()
    account_ids = [a.id for a in accounts]
    opening_by_id = {a.id: (a.opening_balance or 0.0) for a in accounts}
    type_by_id = {a.id: a.account_type for a in accounts}

    yearly = []
    prev_value = None
    for year in range(min_month.year, max_month.year + 1):
        year_end = date(year, 12, 1)
        if year_end > max_month:
            year_end = max_month
        month_end = snapshots_service.month_end(year_end)
        rows = (
            DailyAccountBalance.query.with_entities(
                DailyAccountBalance.account_id,
                func.coalesce(func.sum(DailyAccountBalance.balance), 0.0)
            )
            .filter(DailyAccountBalance.account_id.in_(account_ids))
            .filter(DailyAccountBalance.date <= month_end)
            .group_by(DailyAccountBalance.account_id)
            .all()
        )
        sums = {row[0]: row[1] for row in rows}
        assets = 0.0
        liabilities = 0.0
        for acc_id in account_ids:
            val = opening_by_id.get(acc_id, 0.0) + sums.get(acc_id, 0.0)
            if type_by_id[acc_id] == 'Asset':
                assets += val
            else:
                liabilities += val
        networth = assets + liabilities
        pct = None
        if prev_value is not None and abs(prev_value) > 0.00001:
            pct = ((networth - prev_value) / abs(prev_value)) * 100.0
        yearly.append({
            'year': year_end.year,
            'networth': networth,
            'pct_change': pct
        })
        prev_value = networth

    return {'yearly': yearly}


def net_savings_series_report():
    max_date = DailyAccountBalance.query.with_entities(func.max(DailyAccountBalance.date)).scalar()
    min_date = DailyAccountBalance.query.with_entities(func.min(DailyAccountBalance.date)).scalar()
    if not max_date or not min_date:
        return {'months': []}

    min_month = date(min_date.year, min_date.month, 1)
    max_month = date(max_date.year, max_date.month, 1)
    months = _months_between(min_month, max_month)

    accounts = Account.query.filter(Account.account_type.in_(['Income', 'Expense'])).all()
    account_ids = [a.id for a in accounts]
    type_by_id = {a.id: a.account_type for a in accounts}

    series = []
    for month in months:
        month_start = date(month.year, month.month, 1)
        month_end = snapshots_service.month_end(month)
        rows = (
            DailyAccountBalance.query.with_entities(
                DailyAccountBalance.account_id,
                func.coalesce(func.sum(DailyAccountBalance.balance), 0.0)
            )
            .filter(DailyAccountBalance.account_id.in_(account_ids))
            .filter(DailyAccountBalance.date >= month_start)
            .filter(DailyAccountBalance.date <= month_end)
            .group_by(DailyAccountBalance.account_id)
            .all()
        )
        sums = {row[0]: row[1] for row in rows}
        income = 0.0
        expense = 0.0
        for acc_id in account_ids:
            val = sums.get(acc_id, 0.0)
            if type_by_id[acc_id] == 'Income':
                income += abs(val)
            else:
                expense += abs(val)
        net = income - expense
        pct = None
        if income > 0.00001:
            pct = (net / income) * 100.0
        series.append({
            'month': month.strftime('%Y-%m'),
            'income': income,
            'expense': expense,
            'net_savings': net,
            'net_savings_pct': pct
        })

    return {'months': series}


def networth_monthly_series_report():
    max_date = DailyAccountBalance.query.with_entities(func.max(DailyAccountBalance.date)).scalar()
    min_date = DailyAccountBalance.query.with_entities(func.min(DailyAccountBalance.date)).scalar()
    if not max_date or not min_date:
        return {'months': []}

    min_month = date(min_date.year, min_date.month, 1)
    max_month = date(max_date.year, max_date.month, 1)
    months = _months_between(min_month, max_month)

    accounts = Account.query.filter(Account.account_type.in_(['Asset', 'Liability'])).all()
    account_ids = [a.id for a in accounts]
    opening_by_id = {a.id: (a.opening_balance or 0.0) for a in accounts}
    type_by_id = {a.id: a.account_type for a in accounts}

    series = []
    prev_value = None
    for month in months:
        month_end = snapshots_service.month_end(month)
        rows = (
            DailyAccountBalance.query.with_entities(
                DailyAccountBalance.account_id,
                func.coalesce(func.sum(DailyAccountBalance.balance), 0.0)
            )
            .filter(DailyAccountBalance.account_id.in_(account_ids))
            .filter(DailyAccountBalance.date <= month_end)
            .group_by(DailyAccountBalance.account_id)
            .all()
        )
        sums = {row[0]: row[1] for row in rows}
        assets = 0.0
        liabilities = 0.0
        for acc_id in account_ids:
            val = opening_by_id.get(acc_id, 0.0) + sums.get(acc_id, 0.0)
            if type_by_id[acc_id] == 'Asset':
                assets += val
            else:
                liabilities += val
        networth = assets + liabilities
        delta = None
        pct = None
        if prev_value is not None:
            delta = networth - prev_value
            if abs(prev_value) > 0.00001:
                pct = (delta / abs(prev_value)) * 100.0
        series.append({
            'month': month.strftime('%Y-%m'),
            'networth': networth,
            'delta': delta,
            'pct_change': pct
        })
        prev_value = networth

    return {'months': series}


def investment_flows_report(account_ids, months=13):
    if not account_ids:
        return {'months': []}

    today = date.today()
    end_month = date(today.year, today.month, 1)
    start_month = _add_months(end_month, -(months - 1))
    month_list = [ _add_months(start_month, i) for i in range(months) ]

    flows = []
    for month in month_list:
        month_start = date(month.year, month.month, 1)
        month_end = snapshots_service.month_end(month)
        net = (
            TransactionLine.query.session.query(
                func.coalesce(
                    func.sum(
                        case(
                            (func.upper(TransactionLine.line_type) == 'DEBIT', TransactionLine.amount),
                            else_=-TransactionLine.amount
                        )
                    ),
                    0.0
                )
            )
            .filter(TransactionLine.account_id.in_(account_ids))
            .filter(TransactionLine.date >= month_start)
            .filter(TransactionLine.date <= month_end)
            .scalar()
        )
        flows.append({
            'month': month.strftime('%Y-%m'),
            'net_invested': float(net or 0.0)
        })

    return {'months': flows}


def cashflow_sankey_data(month_str=None):
    today = date.today()
    if month_str:
        try:
            parsed = datetime.strptime(month_str, '%Y-%m').date()
            month_start = date(parsed.year, parsed.month, 1)
        except Exception:
            month_start = date(today.year, today.month, 1)
    else:
        month_start = date(today.year, today.month, 1)

    month_end = snapshots_service.month_end(month_start)

    entries = (
        JournalEntry.query.join(TransactionLine)
        .filter(TransactionLine.date >= month_start)
        .filter(TransactionLine.date <= month_end)
        .distinct()
        .order_by(JournalEntry.entry_date.asc())
        .all()
    )

    accounts = Account.query.order_by(Account.account_type.asc(), Account.name.asc()).all()

    return {
        'month': month_start.strftime('%Y-%m'),
        'accounts': [account_to_dict(a) for a in accounts],
        'entries': [entry_to_dict(e, include_lines=True) for e in entries]
    }
