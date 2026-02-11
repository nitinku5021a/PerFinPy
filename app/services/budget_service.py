from datetime import date, datetime
from app import db
from app.models import MonthlyBudget, BudgetEntryAssignment, JournalEntry, TransactionLine


VALID_OWNERS = {'Guchi', 'Gunu', 'None'}


def _month_start_from_key(month_key=None):
    if month_key:
        parsed = datetime.strptime(month_key, '%Y-%m').date()
        return date(parsed.year, parsed.month, 1)
    today = date.today()
    return date(today.year, today.month, 1)


def _next_month(d):
    y = d.year + (d.month // 12)
    m = (d.month % 12) + 1
    return date(y, m, 1)


def _previous_month(d):
    y = d.year if d.month > 1 else d.year - 1
    m = d.month - 1 if d.month > 1 else 12
    return date(y, m, 1)


def _month_bounds(month_start):
    start = month_start
    end = _next_month(month_start)
    return start, end


def _normalize_owner(owner):
    if owner is None:
        return 'None'
    value = str(owner).strip()
    if value not in VALID_OWNERS:
        raise ValueError('Owner must be one of Guchi, Gunu, None')
    return value


def _load_month_entries(month_start):
    start, end = _month_bounds(month_start)
    entries = (
        JournalEntry.query
        .join(TransactionLine, TransactionLine.journal_entry_id == JournalEntry.id)
        .filter(TransactionLine.date >= start)
        .filter(TransactionLine.date < end)
        .distinct()
        .order_by(JournalEntry.entry_date.desc(), JournalEntry.id.desc())
        .all()
    )
    return entries


def _summarize_entry(entry):
    debit_lines = [l for l in entry.transaction_lines if (l.line_type or '').upper() == 'DEBIT']
    credit_lines = [l for l in entry.transaction_lines if (l.line_type or '').upper() == 'CREDIT']

    debit_name = debit_lines[0].account.name if len(debit_lines) == 1 else "Multiple"
    credit_name = credit_lines[0].account.name if len(credit_lines) == 1 else "Multiple"

    amount = 0.0
    if debit_lines:
        amount = sum(float(l.amount or 0.0) for l in debit_lines)
    elif credit_lines:
        amount = sum(float(l.amount or 0.0) for l in credit_lines)

    expense_amount = 0.0
    for line in entry.transaction_lines:
        if not line.account or line.account.account_type != 'Expense':
            continue
        if (line.line_type or '').upper() == 'DEBIT':
            expense_amount += float(line.amount or 0.0)
        else:
            expense_amount -= float(line.amount or 0.0)

    return {
        'entry_id': entry.id,
        'date': entry.entry_date.isoformat() if entry.entry_date else None,
        'description': entry.description or '',
        'reference': entry.reference or '',
        'debit_account': debit_name,
        'credit_account': credit_name,
        'amount': amount,
        'expense_amount': expense_amount
    }


def _compute_summary(budget_amount, guchi_opening, gunu_opening, entry_payloads):
    guchi_expense = sum(
        float(item['expense_amount']) for item in entry_payloads if item['owner'] == 'Guchi'
    )
    gunu_expense = sum(
        float(item['expense_amount']) for item in entry_payloads if item['owner'] == 'Gunu'
    )
    common_spent = sum(
        float(item['expense_amount']) for item in entry_payloads if item['owner'] == 'None'
    )

    total_expense = guchi_expense + gunu_expense + common_spent
    remaining_budget = float(budget_amount) - total_expense
    discretionary_pool = float(budget_amount) - common_spent
    remaining_shared = discretionary_pool - guchi_expense - gunu_expense
    each_remaining_power = remaining_shared / 2.0

    return {
        'total_expense': total_expense,
        'common_spent': common_spent,
        'guchi_expense': guchi_expense,
        'gunu_expense': gunu_expense,
        'remaining_budget': remaining_budget,
        'discretionary_pool': discretionary_pool,
        'remaining_shared': remaining_shared,
        'guchi_remaining_power': each_remaining_power,
        'gunu_remaining_power': each_remaining_power,
        'guchi_final_available': float(guchi_opening) + each_remaining_power,
        'gunu_final_available': float(gunu_opening) + each_remaining_power
    }


def _compute_month_final_available(month_start):
    config = MonthlyBudget.query.filter_by(month=month_start).first()
    if not config:
        return 0.0, 0.0

    entries = _load_month_entries(month_start)
    entry_ids = [entry.id for entry in entries]
    assignments = (
        BudgetEntryAssignment.query
        .filter(BudgetEntryAssignment.month == month_start)
        .filter(BudgetEntryAssignment.journal_entry_id.in_(entry_ids))
        .all()
    ) if entry_ids else []
    owner_by_entry = {a.journal_entry_id: _normalize_owner(a.owner) for a in assignments}

    payloads = []
    for entry in entries:
        summary = _summarize_entry(entry)
        payloads.append({
            'owner': owner_by_entry.get(entry.id, 'None'),
            'expense_amount': summary['expense_amount']
        })
    summary = _compute_summary(
        config.budget_amount or 0.0,
        config.guchi_opening_balance or 0.0,
        config.gunu_opening_balance or 0.0,
        payloads
    )
    return summary['guchi_final_available'], summary['gunu_final_available']


def _get_or_create_month_config(month_start):
    config = MonthlyBudget.query.filter_by(month=month_start).first()
    if config:
        return config

    prev_month = _previous_month(month_start)
    prev_guchi, prev_gunu = _compute_month_final_available(prev_month)
    config = MonthlyBudget(
        month=month_start,
        budget_amount=0.0,
        guchi_opening_balance=prev_guchi,
        gunu_opening_balance=prev_gunu
    )
    db.session.add(config)
    db.session.commit()
    return config


def monthly_budget_report(month_key=None):
    month_start = _month_start_from_key(month_key)
    config = _get_or_create_month_config(month_start)
    entries = _load_month_entries(month_start)
    entry_ids = [entry.id for entry in entries]

    assignments = (
        BudgetEntryAssignment.query
        .filter(BudgetEntryAssignment.month == month_start)
        .filter(BudgetEntryAssignment.journal_entry_id.in_(entry_ids))
        .all()
    ) if entry_ids else []
    owner_by_entry = {a.journal_entry_id: _normalize_owner(a.owner) for a in assignments}

    entry_payloads = []
    for entry in entries:
        summary = _summarize_entry(entry)
        owner = owner_by_entry.get(entry.id, 'None')
        entry_payloads.append({
            'entry_id': summary['entry_id'],
            'date': summary['date'],
            'description': summary['description'],
            'reference': summary['reference'],
            'debit_account': summary['debit_account'],
            'credit_account': summary['credit_account'],
            'amount': summary['amount'],
            'expense_amount': summary['expense_amount'],
            'owner': owner
        })

    summary = _compute_summary(
        config.budget_amount or 0.0,
        config.guchi_opening_balance or 0.0,
        config.gunu_opening_balance or 0.0,
        entry_payloads
    )

    min_txn_date = db.session.query(db.func.min(TransactionLine.date)).scalar()
    max_txn_date = db.session.query(db.func.max(TransactionLine.date)).scalar()

    return {
        'month': month_start.strftime('%Y-%m'),
        'budget': {
            'budget_amount': float(config.budget_amount or 0.0),
            'guchi_opening_balance': float(config.guchi_opening_balance or 0.0),
            'gunu_opening_balance': float(config.gunu_opening_balance or 0.0)
        },
        'summary': summary,
        'entries': entry_payloads,
        'min_month': min_txn_date.strftime('%Y-%m') if min_txn_date else None,
        'max_month': max_txn_date.strftime('%Y-%m') if max_txn_date else month_start.strftime('%Y-%m')
    }


def update_monthly_budget_settings(month_key, budget_amount, guchi_opening_balance, gunu_opening_balance):
    month_start = _month_start_from_key(month_key)
    config = _get_or_create_month_config(month_start)
    config.budget_amount = float(budget_amount or 0.0)
    config.guchi_opening_balance = float(guchi_opening_balance or 0.0)
    config.gunu_opening_balance = float(gunu_opening_balance or 0.0)
    db.session.commit()
    return {'ok': True}


def assign_entry_owner(month_key, journal_entry_id, owner):
    month_start = _month_start_from_key(month_key)
    normalized_owner = _normalize_owner(owner)

    entry = JournalEntry.query.get_or_404(int(journal_entry_id))
    start, end = _month_bounds(month_start)
    exists_in_month = (
        TransactionLine.query
        .filter(TransactionLine.journal_entry_id == entry.id)
        .filter(TransactionLine.date >= start)
        .filter(TransactionLine.date < end)
        .first()
    ) is not None
    if not exists_in_month:
        raise ValueError('Transaction does not belong to selected month')

    assignment = (
        BudgetEntryAssignment.query
        .filter_by(month=month_start, journal_entry_id=entry.id)
        .first()
    )
    if assignment:
        assignment.owner = normalized_owner
    else:
        assignment = BudgetEntryAssignment(
            month=month_start,
            journal_entry_id=entry.id,
            owner=normalized_owner
        )
        db.session.add(assignment)

    db.session.commit()
    return {'ok': True}
