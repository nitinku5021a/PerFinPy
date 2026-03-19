from datetime import datetime
from app import db
from app.models import Goal, GoalSetting


def _get_or_create_settings():
    settings = GoalSetting.query.order_by(GoalSetting.id.asc()).first()
    if settings:
        return settings
    settings = GoalSetting(interest_rate=0.0)
    db.session.add(settings)
    db.session.commit()
    return settings


def _rate_to_multiplier(rate):
    return float(rate or 0.0) / 100.0


def _goal_to_dict(goal, interest_rate):
    current = float(goal.current_corpus or 0.0)
    yearly_income = current * _rate_to_multiplier(interest_rate)
    target = float(goal.target_corpus or 0.0)
    target_yearly_income = target * _rate_to_multiplier(interest_rate)
    return {
        'id': goal.id,
        'description': goal.description or '',
        'target_corpus': target,
        'target_year': int(goal.target_year or 0),
        'current_corpus': current,
        'yearly_income': yearly_income,
        'target_yearly_income': target_yearly_income
    }


def list_goals():
    settings = _get_or_create_settings()
    goals = Goal.query.order_by(Goal.id.asc()).all()
    return {
        'interest_rate': float(settings.interest_rate or 0.0),
        'goals': [_goal_to_dict(g, settings.interest_rate) for g in goals]
    }


def update_interest_rate(rate):
    settings = _get_or_create_settings()
    settings.interest_rate = float(rate or 0.0)
    db.session.commit()
    return {'ok': True}


def create_goal(payload):
    description = (payload.get('description') or '').strip()
    if not description:
        raise ValueError('Description is required')

    target_year_raw = payload.get('target_year')
    try:
        target_year = int(target_year_raw)
    except Exception:
        raise ValueError('Target year must be a number')

    target_corpus = float(payload.get('target_corpus') or 0.0)
    current_corpus = float(payload.get('current_corpus') or 0.0)

    goal = Goal(
        description=description,
        target_corpus=target_corpus,
        target_year=target_year,
        current_corpus=current_corpus
    )
    db.session.add(goal)
    db.session.commit()
    return {'goal_id': goal.id}


def update_goal(goal_id, payload):
    goal = Goal.query.get_or_404(goal_id)

    description = (payload.get('description') or '').strip()
    if not description:
        raise ValueError('Description is required')

    target_year_raw = payload.get('target_year')
    try:
        target_year = int(target_year_raw)
    except Exception:
        raise ValueError('Target year must be a number')

    goal.description = description
    goal.target_year = target_year
    goal.target_corpus = float(payload.get('target_corpus') or 0.0)
    goal.current_corpus = float(payload.get('current_corpus') or 0.0)

    db.session.commit()
    return {'ok': True}


def delete_goal(goal_id):
    goal = Goal.query.get_or_404(goal_id)
    db.session.delete(goal)
    db.session.commit()
    return {'ok': True}
