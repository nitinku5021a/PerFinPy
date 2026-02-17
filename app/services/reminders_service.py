import calendar
from datetime import date, datetime

from app import db
from app.models import ReminderTask, ReminderOccurrence


def _month_start_from_key(month_key=None):
    if month_key:
        parsed = datetime.strptime(month_key, '%Y-%m').date()
        return date(parsed.year, parsed.month, 1)
    today = date.today()
    return date(today.year, today.month, 1)


def _due_date_for_month(month_start, due_day_of_month):
    last_day = calendar.monthrange(month_start.year, month_start.month)[1]
    day = min(max(int(due_day_of_month), 1), last_day)
    return date(month_start.year, month_start.month, day)


def _serialize_occurrence(occurrence):
    task = occurrence.task
    return {
        'occurrence_id': occurrence.id,
        'task_id': task.id,
        'title': task.title,
        'notes': task.notes or '',
        'due_day_of_month': int(task.due_day_of_month),
        'due_date': occurrence.due_date.isoformat() if occurrence.due_date else None,
        'is_done': bool(occurrence.is_done),
        'is_active': bool(task.is_active),
    }


def ensure_month_occurrences(month_start):
    active_tasks = ReminderTask.query.filter_by(is_active=True).all()
    if not active_tasks:
        return

    task_ids = [task.id for task in active_tasks]
    existing = (
        ReminderOccurrence.query
        .filter(ReminderOccurrence.month == month_start)
        .filter(ReminderOccurrence.reminder_task_id.in_(task_ids))
        .all()
    )
    existing_task_ids = {item.reminder_task_id for item in existing}

    created = False
    for task in active_tasks:
        if task.id in existing_task_ids:
            continue
        due_date = _due_date_for_month(month_start, task.due_day_of_month)
        db.session.add(
            ReminderOccurrence(
                reminder_task_id=task.id,
                month=month_start,
                due_date=due_date,
                is_done=False,
                done_at=None,
            )
        )
        created = True

    if created:
        db.session.commit()


def list_month_reminders(month_key=None):
    month_start = _month_start_from_key(month_key)
    ensure_month_occurrences(month_start)

    reminders = (
        ReminderOccurrence.query
        .join(ReminderTask, ReminderTask.id == ReminderOccurrence.reminder_task_id)
        .filter(ReminderOccurrence.month == month_start)
        .filter(ReminderOccurrence.is_removed.is_(False))
        .order_by(ReminderOccurrence.due_date.asc(), ReminderTask.title.asc())
        .all()
    )

    return {
        'month': month_start.strftime('%Y-%m'),
        'reminders': [_serialize_occurrence(item) for item in reminders],
    }


def create_task(title, notes, due_day_of_month):
    title_value = (title or '').strip()
    if not title_value:
        raise ValueError('Title is required')

    try:
        due_day = int(due_day_of_month)
    except (TypeError, ValueError):
        raise ValueError('Due day of month must be a number')

    if due_day < 1 or due_day > 31:
        raise ValueError('Due day of month must be between 1 and 31')

    task = ReminderTask(
        title=title_value,
        notes=(notes or '').strip() or None,
        due_day_of_month=due_day,
        is_active=True,
    )
    db.session.add(task)
    db.session.flush()

    current_month_start = _month_start_from_key(None)
    db.session.add(
        ReminderOccurrence(
            reminder_task_id=task.id,
            month=current_month_start,
            due_date=_due_date_for_month(current_month_start, due_day),
            is_done=False,
            done_at=None,
        )
    )
    db.session.commit()
    return {'ok': True, 'task_id': task.id}


def set_occurrence_done(occurrence_id, is_done):
    occurrence = ReminderOccurrence.query.get_or_404(int(occurrence_id))
    if occurrence.is_removed:
        raise ValueError('Removed reminder cannot be updated')
    done = bool(is_done)
    occurrence.is_done = done
    occurrence.done_at = datetime.utcnow() if done else None
    db.session.commit()
    return {'ok': True}


def remove_occurrence(occurrence_id):
    occurrence = ReminderOccurrence.query.get_or_404(int(occurrence_id))
    occurrence.is_removed = True
    occurrence.removed_at = datetime.utcnow()
    occurrence.is_done = False
    occurrence.done_at = None
    db.session.commit()
    return {'ok': True}


def delete_task(task_id):
    task = ReminderTask.query.get_or_404(int(task_id))
    db.session.delete(task)
    db.session.commit()
    return {'ok': True}
