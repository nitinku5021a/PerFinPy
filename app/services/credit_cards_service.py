from app import db
from app.models import CreditCard


def _normalize_optional_text(value):
    text = (value or '').strip()
    return text or None


def _parse_day_of_month(value, field_name):
    if value in (None, ''):
        return None
    try:
        day = int(value)
    except Exception:
        raise ValueError(f'{field_name} must be a whole number')
    if day < 1 or day > 31:
        raise ValueError(f'{field_name} must be between 1 and 31')
    return day


def _parse_annual_fee(value):
    if value in (None, ''):
        return None
    try:
        fee = float(value)
    except Exception:
        raise ValueError('Annual Fee must be a number')
    if fee < 0:
        raise ValueError('Annual Fee cannot be negative')
    return fee


def _credit_card_to_dict(card):
    return {
        'id': card.id,
        'card_name': card.card_name or '',
        'holder_name': card.holder_name or '',
        'card_details': card.card_details or '',
        'features_benefits': card.features_benefits or '',
        'annual_fee': float(card.annual_fee) if card.annual_fee is not None else None,
        'statement_date': int(card.statement_day) if card.statement_day is not None else None,
        'payment_date': int(card.payment_day) if card.payment_day is not None else None
    }


def _ensure_unique(card_name, holder_name, exclude_id=None):
    q = (
        CreditCard.query
        .filter(db.func.lower(CreditCard.card_name) == card_name.lower())
        .filter(db.func.lower(CreditCard.holder_name) == holder_name.lower())
    )
    if exclude_id is not None:
        q = q.filter(CreditCard.id != exclude_id)
    if q.first():
        raise ValueError('A credit card with the same card name and holder name already exists')


def list_credit_cards():
    cards = (
        CreditCard.query
        .order_by(CreditCard.holder_name.asc(), CreditCard.card_name.asc(), CreditCard.id.asc())
        .all()
    )
    return {'credit_cards': [_credit_card_to_dict(card) for card in cards]}


def create_credit_card(payload):
    card_name = (payload.get('card_name') or '').strip()
    holder_name = (payload.get('holder_name') or '').strip()
    if not card_name:
        raise ValueError('Card Name is required')
    if not holder_name:
        raise ValueError('Holder Name is required')

    _ensure_unique(card_name, holder_name)

    card = CreditCard(
        card_name=card_name,
        holder_name=holder_name,
        card_details=_normalize_optional_text(payload.get('card_details')),
        features_benefits=_normalize_optional_text(payload.get('features_benefits')),
        annual_fee=_parse_annual_fee(payload.get('annual_fee')),
        statement_day=_parse_day_of_month(payload.get('statement_date'), 'Statement Date'),
        payment_day=_parse_day_of_month(payload.get('payment_date'), 'Payment Date')
    )
    db.session.add(card)
    db.session.commit()
    return {'credit_card_id': card.id}


def update_credit_card(card_id, payload):
    card = CreditCard.query.get_or_404(card_id)

    card_name = (payload.get('card_name') or '').strip()
    holder_name = (payload.get('holder_name') or '').strip()
    if not card_name:
        raise ValueError('Card Name is required')
    if not holder_name:
        raise ValueError('Holder Name is required')

    _ensure_unique(card_name, holder_name, exclude_id=card.id)

    card.card_name = card_name
    card.holder_name = holder_name
    card.card_details = _normalize_optional_text(payload.get('card_details'))
    card.features_benefits = _normalize_optional_text(payload.get('features_benefits'))
    card.annual_fee = _parse_annual_fee(payload.get('annual_fee'))
    card.statement_day = _parse_day_of_month(payload.get('statement_date'), 'Statement Date')
    card.payment_day = _parse_day_of_month(payload.get('payment_date'), 'Payment Date')
    db.session.commit()
    return {'ok': True}


def delete_credit_card(card_id):
    card = CreditCard.query.get_or_404(card_id)
    db.session.delete(card)
    db.session.commit()
    return {'ok': True}
