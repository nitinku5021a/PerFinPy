from flask import Blueprint, jsonify, request
from app.services import budget_service

bp = Blueprint('budget', __name__, url_prefix='/budget')


@bp.route('/monthly')
def monthly_budget():
    month = request.args.get('month')
    payload = budget_service.monthly_budget_report(month)
    return jsonify(payload)


@bp.route('/monthly/settings', methods=['POST'])
def monthly_budget_settings():
    try:
        payload = request.get_json(silent=True) or {}
        month = payload.get('month')
        budget_amount = payload.get('budget_amount', 0.0)
        guchi_opening_balance = payload.get('guchi_opening_balance', 0.0)
        gunu_opening_balance = payload.get('gunu_opening_balance', 0.0)
        result = budget_service.update_monthly_budget_settings(
            month,
            budget_amount,
            guchi_opening_balance,
            gunu_opening_balance
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@bp.route('/monthly/assign-owner', methods=['POST'])
def monthly_assign_owner():
    try:
        payload = request.get_json(silent=True) or {}
        month = payload.get('month')
        journal_entry_id = payload.get('journal_entry_id')
        owner = payload.get('owner')
        result = budget_service.assign_entry_owner(month, journal_entry_id, owner)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400
