from flask import Blueprint, jsonify, request

from app import db
from app.services import reminders_service

bp = Blueprint('reminders', __name__, url_prefix='/reminders')


@bp.route('/monthly')
def monthly_reminders():
    month = request.args.get('month')
    try:
        payload = reminders_service.list_month_reminders(month)
        return jsonify(payload)
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@bp.route('/tasks', methods=['POST'])
def create_task():
    payload = request.get_json(silent=True) or {}
    try:
        result = reminders_service.create_task(
            payload.get('title'),
            payload.get('notes'),
            payload.get('due_day_of_month')
        )
        return jsonify(result)
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@bp.route('/occurrences/<int:occurrence_id>/done', methods=['POST'])
def set_occurrence_done(occurrence_id):
    payload = request.get_json(silent=True) or {}
    try:
        result = reminders_service.set_occurrence_done(occurrence_id, payload.get('is_done', False))
        return jsonify(result)
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@bp.route('/occurrences/<int:occurrence_id>', methods=['DELETE'])
def delete_occurrence(occurrence_id):
    try:
        result = reminders_service.remove_occurrence(occurrence_id)
        return jsonify(result)
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@bp.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    try:
        result = reminders_service.delete_task(task_id)
        return jsonify(result)
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
