"""
Excel import utility for bulk transaction loading.
Supports hierarchical account format: "TopLevel:MiddleLevel:Account"
"""
from datetime import datetime, date
from app import db
from app.models import Account, JournalEntry, TransactionLine, AccountType


def parse_account_path(path_str, account_type):
    """
    Parse account hierarchy string and resolve/create accounts.
    Format: "TopLevel:MiddleLevel:Account"
    Returns the leaf Account object.
    """
    parts = [p.strip() for p in path_str.split(':')]
    
    if not parts or not parts[0]:
        raise ValueError(f"Invalid account path: {path_str}")
    
    # Ensure we have max 3 levels (1 parent + 1 child + 1 leaf or 1 parent + 1 leaf)
    if len(parts) > 3:
        raise ValueError(f"Account path exceeds max 2 levels: {path_str}")

    # If the first segment is exactly an AccountType name (e.g., "Expense", "Asset"),
    # drop it from the parts so we don't create a top-level account named after the type.
    type_names = [t.value.lower() for t in AccountType]
    if parts and parts[0].strip().lower() in type_names:
        parts = parts[1:]

    if not parts:
        raise ValueError(f"Account path must contain an account name after the type: {path_str}")
    
    parent_account = None
    current_account = None
    
    for i, name in enumerate(parts):
        if not name:
            raise ValueError(f"Empty account name in path: {path_str}")
        
        # Top level - try to find by name and account_type
        if i == 0:
            current_account = Account.query.filter_by(name=name, parent_id=None, account_type=account_type).first()
            if not current_account:
                from uuid import uuid4
                current_account = Account(
                    code=f"__auto__{uuid4().hex[:8]}",
                    name=name,
                    account_type=account_type,
                    parent_id=None
                )
                db.session.add(current_account)
                db.session.flush()
            parent_account = current_account
        else:
            # Child of parent - attempt to find by name under parent with same account_type
            current_account = Account.query.filter_by(name=name, parent_id=parent_account.id, account_type=account_type).first()
            if not current_account:
                from uuid import uuid4
                current_account = Account(
                    code=f"__auto__{uuid4().hex[:8]}",
                    name=name,
                    account_type=account_type,
                    parent_id=parent_account.id
                )
                db.session.add(current_account)
                db.session.flush()
            parent_account = current_account
    
    return current_account


def generate_account_code(account_type, level, parent_code=None):
    """
    Generate a unique account code based on type and level.
    """
    type_prefixes = {
        'Asset': '1',
        'Liability': '2',
        'Equity': '3',
        'Income': '4',
        'Expense': '5'
    }
    
    prefix = type_prefixes.get(account_type, '9')
    
    # Count existing accounts of same type/parent to generate unique code
    if parent_code:
        # Child account: parent_code + sequential
        count = Account.query.filter(
            Account.code.startswith(parent_code)
        ).count()
        return f"{parent_code}{count + 1:02d}"
    else:
        # Parent account: type_prefix + sequential
        count = Account.query.filter_by(parent_id=None, account_type=account_type).count()
        return f"{prefix}{count + 1:03d}"


def detect_account_type(path_str, default='Asset'):
    """Try to detect an account type from the top-level name in the path. Falls back to default."""
    top = path_str.split(':')[0].strip().lower()
    if any(k in top for k in ['bank', 'cash', 'asset', 'saving']):
        return 'Asset'
    if any(k in top for k in ['credit', 'card', 'loan', 'liability']):
        return 'Liability'
    if any(k in top for k in ['equity', 'capital', 'owner']):
        return 'Equity'
    if any(k in top for k in ['revenue', 'income', 'sales']):
        return 'Income'
    if any(k in top for k in ['expense', 'expenses', 'cost']):
        return 'Expense'
    return default


def parse_transaction_row(row, row_num):
    """
    Parse a single transaction row.
    Format: Date, Debit Account, Description, Amount, Credit Account
    Returns tuple: (date, debit_account_obj, description, amount, credit_account_obj)
    """
    try:
        # Row should be: Date, Debit, Desc, Amount, Credit
        if len(row) < 5:
            raise ValueError(f"Row has {len(row)} columns, expected 5 (Date, Debit Account, Description, Amount, Credit Account)")
        
        date_str = str(row[0]).strip()
        debit_path = str(row[1]).strip()
        description = str(row[2]).strip()
        amount_str = str(row[3]).strip()
        credit_path = str(row[4]).strip()
        
        # Parse date (handle both DD-MM-YYYY string and datetime objects from Excel)
        from datetime import date as date_type
        entry_date = None
        
        # If it's already a date/datetime object from Excel
        if isinstance(row[0], (datetime, date_type)):
            entry_date = row[0].date() if hasattr(row[0], 'date') else row[0]
        else:
            # Try to parse as string in DD-MM-YYYY format
            date_str = str(row[0]).strip()
            try:
                entry_date = datetime.strptime(date_str, '%d-%m-%Y').date()
            except ValueError:
                # Try YYYY-MM-DD format (ISO)
                try:
                    entry_date = datetime.strptime(date_str.split()[0], '%Y-%m-%d').date()
                except ValueError:
                    raise ValueError(f"Invalid date format '{date_str}'. Expected DD-MM-YYYY or YYYY-MM-DD")
        
        # Parse amount
        try:
            amount = float(amount_str)
            if amount <= 0:
                raise ValueError(f"Amount must be positive, got {amount}")
        except ValueError:
            raise ValueError(f"Invalid amount '{amount_str}'")
        
        # Resolve accounts (create if needed) - attempt to detect types from the path
        debit_type = detect_account_type(debit_path, default='Expense')
        credit_type = detect_account_type(credit_path, default='Asset')

        debit_account = parse_account_path(debit_path, debit_type)
        credit_account = parse_account_path(credit_path, credit_type)
        
        return (entry_date, debit_account, description, amount, credit_account)
    
    except Exception as e:
        raise ValueError(f"Row {row_num}: {str(e)}")


def import_transactions_from_excel(file_stream):
    """
    Import transactions from Excel file.
    Expects columns: Date, Debit Account, Description, Amount, Credit Account
    Returns dict with summary and any errors.
    """
    from openpyxl import load_workbook
    
    results = {
        'success': 0,
        'errors': [],
        'warnings': []
    }
    
    try:
        # Clean up legacy top-level accounts that are named exactly as AccountType (e.g., 'Asset', 'Expense')
        # but have no children and no transaction lines. These often result from older buggy imports.
        type_names = [t.value for t in AccountType]
        removed = []
        for tname in type_names:
            acc = Account.query.filter_by(name=tname, parent_id=None).first()
            if acc:
                # Only remove if it's truly orphaned (no children and no transaction lines pointing to it)
                if not acc.children:
                    tl_count = TransactionLine.query.filter_by(account_id=acc.id).count()
                    if tl_count == 0:
                        db.session.delete(acc)
                        removed.append(tname)
        if removed:
            db.session.commit()
            results['warnings'].append(f"Removed legacy top-level accounts: {', '.join(removed)}")

        workbook = load_workbook(file_stream, data_only=True)
        worksheet = workbook.active

        rows_processed = 0
        for row_idx, row in enumerate(worksheet.iter_rows(min_row=2, values_only=True), start=2):
            # Skip empty rows
            if not row or not any(row):
                continue
            
            try:
                entry_date, debit_account, description, amount, credit_account = parse_transaction_row(row, row_idx)
                
                # Create journal entry
                je = JournalEntry(
                    entry_date=entry_date,
                    description=description
                )
                db.session.add(je)
                db.session.flush()
                
                # Create debit line
                debit_line = TransactionLine(
                    journal_entry_id=je.id,
                    account_id=debit_account.id,
                    line_type='DEBIT',
                    amount=amount,
                    date=entry_date,
                    description=description
                )
                db.session.add(debit_line)
                
                # Create credit line
                credit_line = TransactionLine(
                    journal_entry_id=je.id,
                    account_id=credit_account.id,
                    line_type='CREDIT',
                    amount=amount,
                    date=entry_date,
                    description=description
                )
                db.session.add(credit_line)
                
                db.session.flush()
                results['success'] += 1
                rows_processed += 1
                
            except Exception as e:
                results['errors'].append(str(e))
                db.session.rollback()
        
        if results['success'] > 0:
            db.session.commit()
        
        results['total_rows'] = rows_processed
        
    except Exception as e:
        results['errors'].insert(0, f"Excel parsing error: {str(e)}")
    
    return results
