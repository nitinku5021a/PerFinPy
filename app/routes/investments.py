import os

from flask import Blueprint, jsonify, request
from datetime import date

from app.services import investments_service


bp = Blueprint("investments", __name__, url_prefix="/investments")


def _json_error(err, fallback):
    msg = str(err) if err else fallback
    return jsonify({"error": msg}), 400


@bp.route("", methods=["GET"])
@bp.route("/", methods=["GET"])
def list_investments():
    return jsonify(investments_service.list_investments())


@bp.route("/upload", methods=["POST"])
def upload():
    try:
        file = request.files.get("file")
        if not file:
            return _json_error("Missing file.", "Missing file.")
        category = (request.form.get("category") or "").strip()
        account_name = (request.form.get("account_name") or "").strip()
        if not account_name:
            filename = file.filename or "Account"
            account_name = os.path.splitext(os.path.basename(filename))[0] or "Account"
        headers, data_rows = investments_service.parse_investment_file(file)
        return jsonify(investments_service.upsert_account_from_table(category, account_name, headers, data_rows))
    except Exception as e:
        return _json_error(e, "Upload failed.")


@bp.route("/accounts", methods=["POST"])
def create_account():
    try:
        payload = request.get_json(force=True) or {}
        return jsonify(
            investments_service.create_account(
                payload.get("category"),
                payload.get("name"),
                payload.get("headers"),
            )
        )
    except Exception as e:
        return _json_error(e, "Failed to create account.")


@bp.route("/accounts/<int:account_id>", methods=["DELETE"])
def delete_account(account_id):
    try:
        return jsonify(investments_service.delete_account(account_id))
    except Exception as e:
        return _json_error(e, "Failed to delete account.")


@bp.route("/accounts/<int:account_id>/rows", methods=["POST"])
def add_row(account_id):
    try:
        payload = request.get_json(force=True) or {}
        return jsonify(investments_service.add_row(account_id, payload.get("data") or {}))
    except Exception as e:
        return _json_error(e, "Failed to add row.")


@bp.route("/rows/<int:row_id>", methods=["DELETE"])
def delete_row(row_id):
    try:
        return jsonify(investments_service.delete_row(row_id))
    except Exception as e:
        return _json_error(e, "Failed to delete row.")


@bp.route("/rows/<int:row_id>/mapping", methods=["PUT"])
def set_row_mapping(row_id):
    try:
        payload = request.get_json(force=True) or {}
        return jsonify(investments_service.set_row_mapping(row_id, payload.get("mapping_account_id")))
    except Exception as e:
        return _json_error(e, "Failed to set mapping.")


@bp.route("/rows/<int:row_id>/sync/preview", methods=["POST"])
def sync_preview(row_id):
    try:
        payload = request.get_json(force=True) or {}
        as_of = payload.get("as_of_date") or date.today().isoformat()
        as_of_date = date.fromisoformat(as_of)
        return jsonify(investments_service.sync_preview(row_id, as_of_date))
    except Exception as e:
        return _json_error(e, "Failed to build sync preview.")


@bp.route("/rows/<int:row_id>/sync/post", methods=["POST"])
def sync_post(row_id):
    try:
        payload = request.get_json(force=True) or {}
        as_of = payload.get("as_of_date") or date.today().isoformat()
        as_of_date = date.fromisoformat(as_of)
        offset_account_id = payload.get("offset_account_id")
        if not offset_account_id:
            return _json_error("offset_account_id is required.", "offset_account_id is required.")
        return jsonify(investments_service.sync_post(row_id, as_of_date, offset_account_id))
    except Exception as e:
        return _json_error(e, "Failed to post sync transaction.")


@bp.route("/combined/mapping", methods=["PUT"])
def set_combined_mapping():
    try:
        payload = request.get_json(force=True) or {}
        return jsonify(
            investments_service.set_combined_mapping(
                (payload.get("category") or "").strip(),
                payload.get("instrument"),
                payload.get("mapping_account_id"),
            )
        )
    except Exception as e:
        return _json_error(e, "Failed to set combined mapping.")


@bp.route("/combined/sync/preview", methods=["POST"])
def sync_combined_preview():
    try:
        payload = request.get_json(force=True) or {}
        as_of = payload.get("as_of_date") or date.today().isoformat()
        as_of_date = date.fromisoformat(as_of)
        return jsonify(
            investments_service.sync_combined_preview(
                (payload.get("category") or "").strip(),
                payload.get("instrument"),
                as_of_date,
            )
        )
    except Exception as e:
        return _json_error(e, "Failed to build combined sync preview.")


@bp.route("/combined/sync/post", methods=["POST"])
def sync_combined_post():
    try:
        payload = request.get_json(force=True) or {}
        as_of = payload.get("as_of_date") or date.today().isoformat()
        as_of_date = date.fromisoformat(as_of)
        offset_account_id = payload.get("offset_account_id")
        if not offset_account_id:
            return _json_error("offset_account_id is required.", "offset_account_id is required.")
        create_parent_id = payload.get("create_parent_id")
        purchase_offset_account_id = payload.get("purchase_offset_account_id")
        return jsonify(
            investments_service.sync_combined_post(
                (payload.get("category") or "").strip(),
                payload.get("instrument"),
                as_of_date,
                offset_account_id,
                create_parent_id=create_parent_id,
                purchase_offset_account_id=purchase_offset_account_id,
            )
        )
    except Exception as e:
        return _json_error(e, "Failed to post combined sync transaction.")
