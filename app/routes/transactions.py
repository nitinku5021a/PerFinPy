from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash
from datetime import datetime
from app import db
from app.models import Account, JournalEntry, TransactionLine, AccountType
from app.utils.excel_import import import_transactions_from_excel

bp = Blueprint('transactions', __name__, url_prefix='/transactions')

@bp.route('/')
def list_transactions():
    """List journal entries with optional filters: period (all, ytd, current_month) and account_id (group or leaf account).
    Default view is current month entries."""
    page = request.args.get('page', 1, type=int)
    # Default to current_month so the list shows recent entries by default
    period = request.args.get('period', 'current_month')
    account_id = request.args.get('account_id', type=int)

    # Reuse period parsing from reports
    try:
        from app.routes.reports import get_period_dates
        start_date, end_date = get_period_dates(period)
    except Exception:
        start_date, end_date = (None, None)

    q = JournalEntry.query

    # If filtering by account or period, prefer filtering by TransactionLine.date
    # so the behavior matches the drill-down reports (which are transaction-line date based).
    needs_line_join = False

    if account_id:
        account = Account.query.get(account_id)
        if account:
            descendant_ids = [a.id for a in account.get_all_descendants()] + [account.id]
            q = q.join(TransactionLine).filter(TransactionLine.account_id.in_(descendant_ids))
            needs_line_join = True
        else:
            q = q.join(TransactionLine).filter(TransactionLine.account_id == account_id)
            needs_line_join = True

    # If a date range is present, filter by TransactionLine.date (not JournalEntry.entry_date)
    if start_date or end_date:
        if not needs_line_join:
            q = q.join(TransactionLine)
            needs_line_join = True
        if start_date:
            q = q.filter(TransactionLine.date >= start_date)
        if end_date:
            q = q.filter(TransactionLine.date <= end_date)

    q = q.order_by(JournalEntry.entry_date.desc())
    if needs_line_join:
        # distinct to avoid duplicates when joining
        q = q.distinct()

    entries = q.paginate(page=page, per_page=20)

    # Provide accounts list for the account-based filter (allow group or leaf selection)
    all_accounts = Account.query.order_by(Account.name).all()
    accounts_for_select = all_accounts

    return render_template('transactions/list.html', entries=entries, period=period, account_id=account_id, accounts_for_select=accounts_for_select) 

@bp.route('/new', methods=['GET', 'POST'])
def new_transaction():
    """Create new journal entry"""
    if request.method == 'POST':
        try:
            entry_date = datetime.strptime(request.form['entry_date'], '%Y-%m-%d')
            description = request.form['description']
            reference = request.form.get('reference', '')
            notes = request.form.get('notes', '')
            
            # Create journal entry
            je = JournalEntry(
                entry_date=entry_date,
                description=description,
                reference=reference,
                notes=notes
            )
            
            db.session.add(je)
            db.session.flush()  # Get the ID
            
            # Add transaction lines
            line_count_str = request.form.get('line_count', '0')
            line_count = int(line_count_str) if line_count_str else 0
            for i in range(line_count):
                account_id = request.form.get(f'line_{i}_account_id')
                line_type = request.form.get(f'line_{i}_type')
                amount_str = request.form.get(f'line_{i}_amount', '0')
                amount = float(amount_str) if amount_str else 0.0
                line_desc = request.form.get(f'line_{i}_description', '')
                
                if account_id and amount > 0 and line_type:
                    tl = TransactionLine(
                        journal_entry_id=je.id,
                        account_id=int(account_id),
                        line_type=line_type.upper(),
                        amount=amount,
                        date=entry_date,
                        description=line_desc
                    )
                    db.session.add(tl)
            
            # Validate balanced entry
            if not je.is_balanced():
                db.session.rollback()
                return render_template('transactions/new.html', 
                                     accounts=Account.query.all(),
                                     error='Journal entry must be balanced (debits = credits)')
            
            db.session.commit()
            return redirect(url_for('transactions.list_transactions'))
        
        except Exception as e:
            db.session.rollback()
            return render_template('transactions/new.html',
                                 accounts=Account.query.all(),
                                 error=str(e))
    
    accounts = Account.query.filter_by(is_active=True).all()
    return render_template('transactions/new.html', accounts=accounts)

@bp.route('/<int:id>')
def view_transaction(id):
    """View journal entry details"""
    entry = JournalEntry.query.get_or_404(id)
    return render_template('transactions/view.html', entry=entry)

@bp.route('/<int:id>/edit', methods=['GET', 'POST'])
def edit_transaction(id):
    """Edit existing journal entry and record an edit log"""
    entry = JournalEntry.query.get_or_404(id)

    if request.method == 'POST':
        try:
            import json
            # capture old state
            old_state = {
                'entry': {
                    'entry_date': entry.entry_date.isoformat(),
                    'description': entry.description,
                    'reference': entry.reference,
                    'notes': entry.notes
                },
                'lines': [
                    {
                        'account_id': l.account_id,
                        'line_type': l.line_type,
                        'amount': l.amount,
                        'description': l.description,
                        'date': l.date.isoformat()
                    } for l in entry.transaction_lines
                ]
            }

            # Update entry fields
            entry.entry_date = datetime.strptime(request.form['entry_date'], '%Y-%m-%d').date()
            entry.description = request.form['description']
            entry.reference = request.form.get('reference', '')
            entry.notes = request.form.get('notes', '')

            # Remove existing lines
            for l in list(entry.transaction_lines):
                db.session.delete(l)
            db.session.flush()

            # Recreate lines from form
            line_count_str = request.form.get('line_count', '0')
            line_count = int(line_count_str) if line_count_str else 0
            for i in range(line_count):
                account_id = request.form.get(f'line_{i}_account_id')
                line_type = request.form.get(f'line_{i}_type')
                amount_str = request.form.get(f'line_{i}_amount', '0')
                amount = float(amount_str) if amount_str else 0.0
                line_desc = request.form.get(f'line_{i}_description', '')

                if account_id and amount > 0 and line_type:
                    tl = TransactionLine(
                        journal_entry_id=entry.id,
                        account_id=int(account_id),
                        line_type=line_type.upper(),
                        amount=amount,
                        date=entry.entry_date,
                        description=line_desc
                    )
                    db.session.add(tl)

            # Validate balanced entry
            if not entry.is_balanced():
                db.session.rollback()
                return render_template('transactions/edit.html', entry=entry, accounts=Account.query.filter_by(is_active=True).all(), error='Journal entry must be balanced (debits = credits)')

            # capture new state
            new_state = {
                'entry': {
                    'entry_date': entry.entry_date.isoformat(),
                    'description': entry.description,
                    'reference': entry.reference,
                    'notes': entry.notes
                },
                'lines': [
                    {
                        'account_id': l.account_id,
                        'line_type': l.line_type,
                        'amount': l.amount,
                        'description': l.description,
                        'date': l.date.isoformat()
                    } for l in entry.transaction_lines
                ]
            }

            # create edit log
            from app.models import JournalEntryEditLog
            log = JournalEntryEditLog(
                journal_entry_id=entry.id,
                editor=request.remote_addr or 'web',
                change_summary=f"Edited via web",
                old_data=json.dumps(old_state),
                new_data=json.dumps(new_state)
            )
            db.session.add(log)

            db.session.commit()
            return redirect(url_for('transactions.view_transaction', id=entry.id))

        except Exception as e:
            db.session.rollback()
            return render_template('transactions/edit.html', entry=entry, accounts=Account.query.filter_by(is_active=True).all(), error=str(e))

    # GET
    accounts = Account.query.filter_by(is_active=True).all()
    return render_template('transactions/edit.html', entry=entry, accounts=accounts)

@bp.route('/accounts')
def list_accounts():
    """List chart of accounts"""
    accounts = Account.query.order_by(Account.name).all()
    return render_template('transactions/accounts.html', accounts=accounts)

@bp.route('/accounts/new', methods=['GET', 'POST'])
def new_account():
    """Create new account"""
    if request.method == 'POST':
        try:
            name = request.form.get('name', '').strip()
            account_type = request.form.get('account_type', '').strip()
            parent_id = request.form.get('parent_id')

            # Validate required fields
            if not name:
                raise ValueError('Account name is required')
            if not account_type:
                raise ValueError('Account type is required')

            # Validate account_type value
            valid_types = [t.value for t in AccountType]
            if account_type not in valid_types:
                raise ValueError('Invalid account type')

            # If parent supplied, ensure it exists and has same account_type
            parent_id_int = int(parent_id) if parent_id else None
            if parent_id_int:
                parent = Account.query.get(parent_id_int)
                if not parent:
                    raise ValueError('Selected parent account not found')
                if parent.account_type != account_type:
                    raise ValueError('Parent account type must match selected account type')

            from uuid import uuid4
            account = Account(
                code=f"__auto__{uuid4().hex[:8]}",
                name=name,
                account_type=account_type,
                description=request.form.get('description', ''),
                parent_id=parent_id_int
            )
            db.session.add(account)
            db.session.commit()
            return redirect(url_for('transactions.list_accounts'))
        except Exception as e:
            db.session.rollback()
            parent_accounts = Account.query.filter(Account.parent_id.is_(None)).order_by(Account.name).all()
            account_types = [t.value for t in AccountType]
            return render_template('transactions/new_account.html', error=str(e), parent_accounts=parent_accounts, account_types=account_types)
    
    account_types = [t.value for t in AccountType]
    parent_accounts = Account.query.filter(Account.parent_id.is_(None)).order_by(Account.name).all()
    return render_template('transactions/new_account.html', account_types=account_types, parent_accounts=parent_accounts)

@bp.route('/api/accounts')
def api_accounts():
    """API endpoint to get all accounts"""
    accounts = Account.query.filter_by(is_active=True).all()
    return jsonify([{
        'id': acc.id,
        'name': acc.name,
        'type': acc.account_type
    } for acc in accounts])

@bp.route('/import', methods=['GET', 'POST'])
def import_transactions():
    """Import transactions from Excel file"""
    if request.method == 'POST':
        try:
            if 'file' not in request.files:
                flash('No file selected', 'error')
                return redirect(url_for('transactions.import_transactions'))
            
            file = request.files['file']
            if file.filename == '':
                flash('No file selected', 'error')
                return redirect(url_for('transactions.import_transactions'))
            
            if not file.filename.endswith(('.xlsx', '.xls')):
                flash('File must be Excel format (.xlsx or .xls)', 'error')
                return redirect(url_for('transactions.import_transactions'))
            
            # Process the file
            results = import_transactions_from_excel(file.stream)
            
            if results['errors']:
                error_msg = f"Import completed with {results['success']} successful. Errors:\n" + "\n".join(results['errors'][:10])
                if len(results['errors']) > 10:
                    error_msg += f"\n... and {len(results['errors']) - 10} more errors"
                flash(error_msg, 'warning')
            else:
                flash(f"Successfully imported {results['success']} transactions!", 'success')
            
            return render_template('transactions/import.html', results=results)
        
        except Exception as e:
            flash(f"Error processing file: {str(e)}", 'error')
            return redirect(url_for('transactions.import_transactions'))
    
    return render_template('transactions/import.html')


@bp.route('/export')
def export_transactions():
    """Export transactions to Excel in importer-friendly format: Date, Debit Account, Description, Amount, Credit Account"""
    from io import BytesIO
    from openpyxl import Workbook
    from flask import send_file
    # Optional period filter
    period = request.args.get('period', 'all')
    try:
        from app.routes.reports import get_period_dates
        start_date, end_date = get_period_dates(period)
    except Exception:
        start_date, end_date = (None, None)

    q = JournalEntry.query.order_by(JournalEntry.entry_date.asc())
    if start_date:
        q = q.filter(JournalEntry.entry_date >= start_date)
    if end_date:
        q = q.filter(JournalEntry.entry_date <= end_date)

    wb = Workbook()
    ws = wb.active
    ws.title = 'Transactions'
    ws.append(['Date', 'Debit Account', 'Description', 'Amount', 'Credit Account'])

    complex_ws = wb.create_sheet('Complex Entries')
    complex_ws.append(['JE ID', 'Date', 'Description', 'Account Path', 'Type', 'Amount'])

    for je in q.all():
        debit_lines = [l for l in je.transaction_lines if (l.line_type or '').upper() == 'DEBIT']
        credit_lines = [l for l in je.transaction_lines if (l.line_type or '').upper() == 'CREDIT']

        if len(debit_lines) == 1 and len(credit_lines) == 1:
            d = debit_lines[0]
            c = credit_lines[0]
            ws.append([je.entry_date.strftime('%d-%m-%Y'), d.account.get_path(), je.description or '', d.amount, c.account.get_path()])
        else:
            for l in je.transaction_lines:
                complex_ws.append([je.id, je.entry_date.strftime('%d-%m-%Y'), je.description or '', l.account.get_path(), l.line_type, l.amount])

    stream = BytesIO()
    wb.save(stream)
    stream.seek(0)

    return send_file(stream,
                     download_name='transactions_export.xlsx',
                     as_attachment=True,
                     mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
