from datetime import date, datetime, timedelta

from app import db
from app.models import TradeJournalEntry, TradeSetup
from app.services.serialization import isoformat_or_none


def _month_start_from_key(month_key=None):
    if month_key:
        parsed = datetime.strptime(str(month_key), "%Y-%m").date()
        return date(parsed.year, parsed.month, 1)
    today = date.today()
    return date(today.year, today.month, 1)


def _next_month(month_start):
    year = month_start.year + (month_start.month // 12)
    month = (month_start.month % 12) + 1
    return date(year, month, 1)


def _month_key(value):
    return value.strftime("%Y-%m") if value else None


def _setup_to_dict(setup):
    return {
        "id": setup.id,
        "name": setup.name,
        "start_date": isoformat_or_none(setup.start_date),
        "is_active": bool(setup.is_active),
        "created_at": isoformat_or_none(setup.created_at),
        "updated_at": isoformat_or_none(setup.updated_at),
    }


def _entry_to_dict(entry):
    return {
        "id": entry.id,
        "setup_id": entry.setup_id,
        "trade_date": isoformat_or_none(entry.trade_date),
        "capital_deployed": float(entry.capital_deployed or 0.0),
        "pnl_amount": float(entry.pnl_amount or 0.0),
        "comment": entry.comment or "",
        "created_at": isoformat_or_none(entry.created_at),
        "updated_at": isoformat_or_none(entry.updated_at),
    }


def _group_entries(entries):
    grouped = {}
    for entry in entries:
        grouped.setdefault(entry.setup_id, []).append(entry)
    return grouped


def _parse_date(value, field_name):
    if not value:
        raise ValueError(f"{field_name} is required")
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError(f"{field_name} must be in YYYY-MM-DD format") from exc


def _parse_float(value, field_name):
    if value is None or value == "":
        raise ValueError(f"{field_name} is required")
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be a valid number") from exc


def create_trade_setup(payload):
    name = (payload.get("name") or "").strip()
    if not name:
        raise ValueError("Setup name is required")

    start_date = _parse_date(payload.get("start_date"), "Start date")

    duplicate = TradeSetup.query.filter(db.func.lower(TradeSetup.name) == name.lower()).first()
    if duplicate:
        raise ValueError("A setup with this name already exists")

    setup = TradeSetup(name=name, start_date=start_date, is_active=True)
    db.session.add(setup)
    db.session.commit()
    return {"ok": True, "setup": _setup_to_dict(setup)}


def create_trade_journal_entry(payload):
    setup_id = payload.get("setup_id")
    if setup_id in (None, ""):
        raise ValueError("Setup name is required")

    try:
        setup_id = int(setup_id)
    except (TypeError, ValueError) as exc:
        raise ValueError("Setup name is required") from exc

    setup = db.session.get(TradeSetup, setup_id)
    if not setup:
        raise ValueError("Selected setup was not found")

    trade_date = _parse_date(payload.get("trade_date"), "Date")
    if setup.start_date and trade_date < setup.start_date:
        raise ValueError("Date cannot be earlier than the setup start date")

    capital_deployed = _parse_float(payload.get("capital_deployed"), "Capital deployed")
    pnl_amount = _parse_float(payload.get("pnl_amount"), "Profit or loss amount")
    comment = (payload.get("comment") or "").strip()

    if capital_deployed < 0:
        raise ValueError("Capital deployed cannot be negative")

    existing = TradeJournalEntry.query.filter_by(setup_id=setup.id, trade_date=trade_date).first()
    if existing:
        raise ValueError("An entry for this setup and date already exists")

    entry = TradeJournalEntry(
        setup_id=setup.id,
        trade_date=trade_date,
        capital_deployed=capital_deployed,
        pnl_amount=pnl_amount,
        comment=comment,
    )
    db.session.add(entry)
    db.session.commit()
    return {"ok": True, "entry": _entry_to_dict(entry)}


def trade_journal_page(month_key=None):
    month_start = _month_start_from_key(month_key)
    month_end = _next_month(month_start)
    today = date.today()

    setups = (
        TradeSetup.query
        .order_by(TradeSetup.start_date.asc(), TradeSetup.name.asc(), TradeSetup.id.asc())
        .all()
    )
    all_entries = (
        TradeJournalEntry.query
        .order_by(TradeJournalEntry.trade_date.desc(), TradeJournalEntry.id.desc())
        .all()
    )
    month_entries = (
        TradeJournalEntry.query
        .filter(TradeJournalEntry.trade_date >= month_start)
        .filter(TradeJournalEntry.trade_date < month_end)
        .order_by(TradeJournalEntry.trade_date.desc(), TradeJournalEntry.id.desc())
        .all()
    )

    all_entries_by_setup = _group_entries(all_entries)
    month_entries_by_setup = _group_entries(month_entries)

    setup_payloads = []
    month_total_pnl = 0.0
    all_time_total_pnl = 0.0
    month_entry_count = 0

    for setup in setups:
        setup_all_entries = all_entries_by_setup.get(setup.id, [])
        setup_month_entries = month_entries_by_setup.get(setup.id, [])
        latest_entry = setup_all_entries[0] if setup_all_entries else None

        setup_month_total = sum(float(item.pnl_amount or 0.0) for item in setup_month_entries)
        setup_all_time_total = sum(float(item.pnl_amount or 0.0) for item in setup_all_entries)

        month_total_pnl += setup_month_total
        all_time_total_pnl += setup_all_time_total
        month_entry_count += len(setup_month_entries)

        setup_payloads.append({
            **_setup_to_dict(setup),
            "last_capital_deployed": float(latest_entry.capital_deployed or 0.0) if latest_entry else None,
            "latest_trade_date": isoformat_or_none(latest_entry.trade_date) if latest_entry else None,
            "month_total_pnl": setup_month_total,
            "all_time_total_pnl": setup_all_time_total,
            "entry_count": len(setup_month_entries),
            "entries": [_entry_to_dict(entry) for entry in setup_month_entries],
        })

    min_setup_date = db.session.query(db.func.min(TradeSetup.start_date)).scalar()
    min_entry_date = db.session.query(db.func.min(TradeJournalEntry.trade_date)).scalar()
    max_entry_date = db.session.query(db.func.max(TradeJournalEntry.trade_date)).scalar()

    min_candidates = [item for item in [min_setup_date, min_entry_date] if item]
    min_anchor = min(min_candidates) if min_candidates else month_start
    max_candidates = [item for item in [max_entry_date, today] if item]
    max_anchor = max(max_candidates) if max_candidates else month_start

    return {
        "month": _month_key(month_start),
        "month_start": isoformat_or_none(month_start),
        "month_end": isoformat_or_none(month_end - timedelta(days=1)),
        "today": isoformat_or_none(today),
        "min_month": _month_key(min_anchor),
        "max_month": _month_key(max_anchor),
        "summary": {
            "setup_count": len(setups),
            "month_entry_count": month_entry_count,
            "month_total_pnl": month_total_pnl,
            "all_time_total_pnl": all_time_total_pnl,
        },
        "setup_options": [_setup_to_dict(setup) for setup in setups],
        "setups": setup_payloads,
    }
