from datetime import date, timedelta

from sqlalchemy import func, case
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy import event
from sqlalchemy.orm import Session as SASession, sessionmaker

from app import db
from app.models import (
    Account,
    TransactionLine,
    DailyAccountBalance,
    MonthlyNetWorth,
    MonthlyPnL,
)


def month_start(d):
    return date(d.year, d.month, 1)


def month_end(d):
    next_month = (d.replace(day=28) + timedelta(days=4)).replace(day=1)
    return next_month - timedelta(days=1)


def _collect_accounts(root_accounts):
    accounts = []
    for acc in root_accounts:
        accounts.append(acc)
        accounts.extend(acc.get_all_descendants())
    return accounts


def get_balances_for_accounts(accounts, start_date=None, end_date=None, session=None):
    if not accounts:
        return {}
    session = session or db.session
    account_ids = [a.id for a in accounts]

    q = session.query(
        DailyAccountBalance.account_id,
        func.coalesce(func.sum(DailyAccountBalance.balance), 0.0)
    ).filter(DailyAccountBalance.account_id.in_(account_ids))

    if start_date:
        q = q.filter(DailyAccountBalance.date >= start_date)
    if end_date:
        q = q.filter(DailyAccountBalance.date <= end_date)

    q = q.group_by(DailyAccountBalance.account_id)
    sums = {row[0]: row[1] for row in q.all()}

    return {a.id: (a.opening_balance or 0.0) + sums.get(a.id, 0.0) for a in accounts}


def get_roots_for_type(account_type, session=None):
    session = session or db.session
    accounts = session.query(Account).filter_by(account_type=account_type).all()
    roots = {}
    for acc in accounts:
        root = acc
        while root.parent is not None:
            root = root.parent
        roots[root.id] = root
    return list(roots.values())


def get_group_balance(account, balance_map):
    total = balance_map.get(account.id, 0.0)
    for child in account.children:
        total += get_group_balance(child, balance_map)
    return total


def _opening_balance_by_type(session):
    rows = session.query(
        Account.account_type,
        func.coalesce(func.sum(Account.opening_balance), 0.0)
    ).group_by(Account.account_type).all()
    return {row[0]: row[1] for row in rows}


def recompute_monthly_networth(session, month):
    month_start_date = month_start(month)
    month_end_date = month_end(month)

    opening = _opening_balance_by_type(session)

    sums = session.query(
        Account.account_type,
        func.coalesce(func.sum(DailyAccountBalance.balance), 0.0)
    ).join(Account, Account.id == DailyAccountBalance.account_id).filter(
        DailyAccountBalance.date >= month_start_date,
        DailyAccountBalance.date <= month_end_date
    ).group_by(Account.account_type).all()

    activity = {row[0]: row[1] for row in sums}

    assets = (opening.get('Asset', 0.0) + activity.get('Asset', 0.0))
    liabilities = (opening.get('Liability', 0.0) + activity.get('Liability', 0.0))
    networth = assets - liabilities

    existing = session.query(MonthlyNetWorth).filter_by(month=month_start_date).first()
    if existing:
        existing.assets = assets
        existing.liabilities = liabilities
        existing.networth = networth
    else:
        session.add(MonthlyNetWorth(
            month=month_start_date,
            assets=assets,
            liabilities=liabilities,
            networth=networth
        ))


def recompute_monthly_pnl(session, month):
    month_start_date = month_start(month)
    month_end_date = month_end(month)

    income_roots = get_roots_for_type('Income', session=session)
    expense_roots = get_roots_for_type('Expense', session=session)

    income_accounts = _collect_accounts(income_roots)
    expense_accounts = _collect_accounts(expense_roots)
    balance_map = get_balances_for_accounts(
        income_accounts + expense_accounts,
        month_start_date,
        month_end_date,
        session=session
    )

    total_income = 0.0
    for root in income_roots:
        total_income += abs(get_group_balance(root, balance_map))

    total_expenses = 0.0
    for root in expense_roots:
        total_expenses += get_group_balance(root, balance_map)

    profit = total_income - total_expenses

    existing = session.query(MonthlyPnL).filter_by(month=month_start_date).first()
    if existing:
        existing.income = total_income
        existing.expense = total_expenses
        existing.profit = profit
    else:
        session.add(MonthlyPnL(
            month=month_start_date,
            income=total_income,
            expense=total_expenses,
            profit=profit
        ))


def _line_delta(line):
    line_type = (line.line_type or '').upper()
    return line.amount if line_type == 'DEBIT' else -line.amount


def backfill_snapshots(session=None):
    session = session or db.session

    session.query(DailyAccountBalance).delete()
    session.query(MonthlyNetWorth).delete()
    session.query(MonthlyPnL).delete()
    session.flush()

    rows = session.query(
        TransactionLine.account_id,
        TransactionLine.date,
        func.coalesce(func.sum(
            case(
                (func.upper(TransactionLine.line_type) == 'DEBIT', TransactionLine.amount),
                else_=-TransactionLine.amount
            )
        ), 0.0)
    ).group_by(TransactionLine.account_id, TransactionLine.date).all()

    for account_id, line_date, balance in rows:
        session.add(DailyAccountBalance(
            account_id=account_id,
            date=line_date,
            balance=balance
        ))

    min_date = session.query(func.min(TransactionLine.date)).scalar()
    max_date = session.query(func.max(TransactionLine.date)).scalar()
    if min_date is None or max_date is None:
        min_date = date.today()
        max_date = min_date

    cursor = month_start(min_date)
    last_month = month_start(max_date)
    while cursor <= last_month:
        recompute_monthly_networth(session, cursor)
        recompute_monthly_pnl(session, cursor)
        # advance to next month
        next_month = (cursor.replace(day=28) + timedelta(days=4)).replace(day=1)
        cursor = next_month

    session.commit()


_LISTENERS_REGISTERED = False


def register_snapshot_listeners(db_obj):
    global _LISTENERS_REGISTERED
    if _LISTENERS_REGISTERED:
        return
    _LISTENERS_REGISTERED = True

    @event.listens_for(SASession, "after_flush")
    def _update_snapshots(session, flush_context):
        if session.info.get('snapshot_in_progress') or session.info.get('snapshot_monthly_in_progress'):
            return

        deltas = {}
        months = set()

        for obj in session.new:
            if isinstance(obj, TransactionLine):
                delta = _line_delta(obj)
                key = (obj.account_id, obj.date)
                deltas[key] = deltas.get(key, 0.0) + delta
                months.add(month_start(obj.date))

        for obj in session.deleted:
            if isinstance(obj, TransactionLine):
                delta = -_line_delta(obj)
                key = (obj.account_id, obj.date)
                deltas[key] = deltas.get(key, 0.0) + delta
                months.add(month_start(obj.date))

        if not deltas and not months:
            return

        session.info['snapshot_in_progress'] = True
        try:
            for (account_id, line_date), delta in deltas.items():
                if abs(delta) < 1e-9:
                    continue
                stmt = sqlite_insert(DailyAccountBalance).values(
                    account_id=account_id,
                    date=line_date,
                    balance=delta
                )
                stmt = stmt.on_conflict_do_update(
                    index_elements=['date', 'account_id'],
                    set_={'balance': DailyAccountBalance.balance + delta}
                )
                session.execute(stmt)
            if months:
                pending = session.info.setdefault('snapshot_months', set())
                pending.update(months)
        finally:
            session.info.pop('snapshot_in_progress', None)

    @event.listens_for(SASession, "after_commit")
    def _update_monthly_snapshots(session):
        if session.info.get('snapshot_monthly_in_progress'):
            return
        months = session.info.pop('snapshot_months', None)
        if not months:
            return
        # Use a fresh session; after_commit sessions can't emit SQL
        SessionLocal = sessionmaker(bind=db.engine)
        new_session = SessionLocal()
        new_session.info['snapshot_monthly_in_progress'] = True
        try:
            for month in sorted(months):
                recompute_monthly_networth(new_session, month)
                recompute_monthly_pnl(new_session, month)
            new_session.commit()
        finally:
            new_session.close()
