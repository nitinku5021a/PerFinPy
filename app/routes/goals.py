from flask import Blueprint, jsonify, request
from app.services import goals_service

bp = Blueprint('goals', __name__, url_prefix='/goals')


@bp.route('', methods=['GET'])
def list_goals():
    return jsonify(goals_service.list_goals())


@bp.route('', methods=['POST'])
def create_goal():
    payload = request.get_json(silent=True) or {}
    result = goals_service.create_goal(payload)
    return jsonify(result)


@bp.route('/<int:goal_id>', methods=['PUT'])
def update_goal(goal_id):
    payload = request.get_json(silent=True) or {}
    result = goals_service.update_goal(goal_id, payload)
    return jsonify(result)


@bp.route('/<int:goal_id>', methods=['DELETE'])
def delete_goal(goal_id):
    result = goals_service.delete_goal(goal_id)
    return jsonify(result)


@bp.route('/settings', methods=['POST'])
def update_settings():
    payload = request.get_json(silent=True) or {}
    rate = payload.get('interest_rate')
    result = goals_service.update_interest_rate(rate)
    return jsonify(result)
