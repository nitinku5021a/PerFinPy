from flask import Blueprint, jsonify, request, redirect, url_for
from app.services import reports_service

bp = Blueprint('reports', __name__, url_prefix='/reports')


@bp.route('/networth')
def networth():
    """Networth Report (Personal Finance Balance Sheet) - Side by side layout"""
    period = request.args.get('period', 'all')
    show_zero = request.args.get('show_zero', '0') in ('1', 'true', 'True')
    payload = reports_service.networth_report(period, show_zero)
    return jsonify(payload)

@bp.route('/networth-matrix')
def networth_matrix():
    start_month = request.args.get('start')
    payload = reports_service.networth_matrix_report(start_month)
    return jsonify(payload)

@bp.route('/income-matrix')
def income_matrix():
    start_month = request.args.get('start')
    payload = reports_service.income_matrix_report(start_month)
    return jsonify(payload)

@bp.route('/networth-growth')
def networth_growth():
    payload = reports_service.networth_growth_report()
    return jsonify(payload)

@bp.route('/net-savings-series')
def net_savings_series():
    payload = reports_service.net_savings_series_report()
    return jsonify(payload)

@bp.route('/networth-monthly')
def networth_monthly():
    payload = reports_service.networth_monthly_series_report()
    return jsonify(payload)

@bp.route('/balance-sheet')
def balance_sheet():
    """Balance Sheet Report (Legacy - redirects to networth)"""
    period = request.args.get('period', 'all')
    return redirect(url_for('reports.networth', period=period))

@bp.route('/income-statement')
def income_statement():
    """Income Statement Report"""
    # Default to current month as requested
    period = request.args.get('period', 'current_month')
    show_zero = request.args.get('show_zero', '0') in ('1', 'true', 'True')
    payload = reports_service.income_statement_report(period, show_zero)
    return jsonify(payload)

@bp.route('/trial-balance')
def trial_balance():
    """Trial Balance Report"""
    period = request.args.get('period', 'all')
    payload = reports_service.trial_balance_report(period)
    return jsonify(payload)

@bp.route('/accounts/<int:account_id>/entries')
def account_entries(account_id):
    """Drill-down: show journal entries for an account (including descendants)"""
    period = request.args.get('period', 'ytd')
    payload = reports_service.account_entries_report(account_id, period)
    return jsonify(payload)

