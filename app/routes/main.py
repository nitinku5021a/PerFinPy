from flask import Blueprint, render_template

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    """Home page"""
    return render_template('index.html')

@bp.route('/dashboard')
def dashboard():
    """Dashboard with quick summary"""
    from app.models import Account, JournalEntry
    
    total_entries = JournalEntry.query.count()
    total_accounts = Account.query.count()
    
    return render_template('dashboard.html', 
                         total_entries=total_entries,
                         total_accounts=total_accounts)
