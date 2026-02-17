from flask import Blueprint, jsonify
from app.services.main_service import dashboard_summary

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    """Home page"""
    return jsonify({
        'page': 'index'
    })

@bp.route('/dashboard')
def dashboard():
    """Dashboard with quick summary"""
    return jsonify(dashboard_summary())
