from flask import Blueprint, jsonify, request

from app import db
from app.services import trade_journal_service


bp = Blueprint("trade_journal", __name__, url_prefix="/trade-journal")


@bp.route("")
@bp.route("/")
def trade_journal_page():
    month = request.args.get("month")
    payload = trade_journal_service.trade_journal_page(month)
    return jsonify(payload)


@bp.route("/setups", methods=["POST"])
def create_trade_setup():
    try:
        payload = request.get_json(silent=True) or {}
        result = trade_journal_service.create_trade_setup(payload)
        return jsonify(result)
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 400


@bp.route("/entries", methods=["POST"])
def create_trade_journal_entry():
    try:
        payload = request.get_json(silent=True) or {}
        result = trade_journal_service.create_trade_journal_entry(payload)
        return jsonify(result)
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 400
