from flask import Blueprint, jsonify, request, redirect, url_for, flash, send_file
from app.services import transactions_service

bp = Blueprint('transactions', __name__, url_prefix='/transactions')

@bp.route('/')
def list_transactions():
    """List journal entries with optional filters: period (all, ytd, current_month) and account_id (group or leaf account).
    Default view is current month entries."""
    page = request.args.get('page', 1, type=int)
    # Default to current_month so the list shows recent entries by default
    period = request.args.get('period', 'current_month')
    account_id = request.args.get('account_id', type=int)

    payload = transactions_service.list_transactions(page, period, account_id)
    return jsonify(payload) 

@bp.route('/new', methods=['GET', 'POST'])
def new_transaction():
    """Create new journal entry (simplified: date, debit account, description, amount, credit account)."""
    if request.method == 'POST':
        try:
            transactions_service.create_transaction(request.form)
            return redirect(url_for('transactions.list_transactions'))
        except Exception as e:
            payload = transactions_service.get_new_transaction_form_data()
            payload['error'] = str(e)
            return jsonify(payload)

    return jsonify(transactions_service.get_new_transaction_form_data())

@bp.route('/<int:id>')
def view_transaction(id):
    """View journal entry details"""
    return jsonify(transactions_service.get_transaction_view(id))

@bp.route('/<int:id>/edit', methods=['GET', 'POST'])
def edit_transaction(id):
    """Edit existing journal entry and record an edit log"""
    if request.method == 'POST':
        try:
            result = transactions_service.update_transaction(id, {
                **request.form,
                'editor': request.remote_addr or 'web'
            })
            return redirect(url_for('transactions.view_transaction', id=result['entry_id']))

        except Exception as e:
            payload = transactions_service.get_edit_transaction_form_data(id)
            payload['error'] = str(e)
            return jsonify(payload)

    # GET
    return jsonify(transactions_service.get_edit_transaction_form_data(id))

@bp.route('/accounts')
def list_accounts():
    """List chart of accounts"""
    return jsonify(transactions_service.list_accounts_data())

@bp.route('/accounts/new', methods=['GET', 'POST'])
def new_account():
    """Create new account"""
    if request.method == 'POST':
        try:
            transactions_service.create_account(request.form)
            return redirect(url_for('transactions.list_accounts'))
        except Exception as e:
            payload = transactions_service.get_new_account_form_data()
            payload['error'] = str(e)
            return jsonify(payload)

    return jsonify(transactions_service.get_new_account_form_data())


@bp.route('/accounts/<int:id>/edit', methods=['GET', 'POST'])
def edit_account(id):
    """Edit existing account (name, type, parent, description) with strict validation on type changes"""
    if request.method == 'POST':
        try:
            transactions_service.edit_account(id, request.form)
            return redirect(url_for('transactions.list_accounts'))
        except Exception as e:
            payload = transactions_service.get_edit_account_form_data(id)
            payload['error'] = str(e)
            return jsonify(payload)

    return jsonify(transactions_service.get_edit_account_form_data(id))

@bp.route('/api/accounts')
def api_accounts():
    """API endpoint to get all accounts"""
    accounts = transactions_service.list_accounts_data()['accounts']
    def _camelcase(s):
        if not s:
            return ''
        s = str(s).strip()
        return ':'.join(p.strip().title() for p in s.split(':')) if ':' in s else s.title()

    return jsonify([{
        'id': acc['id'],
        'name': _camelcase(acc['name']),
        'type': acc['account_type']
    } for acc in accounts])

@bp.route('/import', methods=['GET', 'POST'])
def import_transactions():
    """Import transactions from Excel file"""
    if request.method == 'POST':
        try:
            file = request.files.get('file')
            results = transactions_service.import_transactions(file)

            if results['errors']:
                error_msg = f"Import completed with {results['success']} successful. Errors:\n" + "\n".join(results['errors'][:10])
                if len(results['errors']) > 10:
                    error_msg += f"\n... and {len(results['errors']) - 10} more errors"
                flash(error_msg, 'warning')
            else:
                flash(f"Successfully imported {results['success']} transactions!", 'success')

            return jsonify({
                'page': 'transactions_import',
                'results': results
            })
        
        except Exception as e:
            flash(f"Error processing file: {str(e)}", 'error')
            return redirect(url_for('transactions.import_transactions'))
    
    return jsonify({
        'page': 'transactions_import'
    })


@bp.route('/export')
def export_transactions():
    """Export transactions to Excel in importer-friendly format: Date, Debit Account, Description, Amount, Credit Account"""
    # Optional period filter
    period = request.args.get('period', 'all')
    stream = transactions_service.export_transactions(period)
    return send_file(stream,
                     download_name='transactions_export.xlsx',
                     as_attachment=True,
                     mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
