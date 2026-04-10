from flask import Blueprint, jsonify, request

from app import db
from app.services import credit_cards_service

bp = Blueprint('credit_cards', __name__, url_prefix='/credit-cards')


@bp.route('', methods=['GET'])
def list_credit_cards():
    try:
        return jsonify(credit_cards_service.list_credit_cards())
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@bp.route('', methods=['POST'])
def create_credit_card():
    payload = request.get_json(silent=True) or {}
    try:
        return jsonify(credit_cards_service.create_credit_card(payload))
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@bp.route('/<int:card_id>', methods=['PUT'])
def update_credit_card(card_id):
    payload = request.get_json(silent=True) or {}
    try:
        return jsonify(credit_cards_service.update_credit_card(card_id, payload))
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@bp.route('/<int:card_id>', methods=['DELETE'])
def delete_credit_card(card_id):
    try:
        return jsonify(credit_cards_service.delete_credit_card(card_id))
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
