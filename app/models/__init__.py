from datetime import datetime, date
from app import db
from enum import Enum

class AccountType(Enum):
    """Chart of Accounts types"""
    ASSET = 'Asset'
    LIABILITY = 'Liability'
    EQUITY = 'Equity'
    INCOME = 'Income'
    EXPENSE = 'Expense'

class Account(db.Model):
    """Chart of Accounts"""
    __tablename__ = 'accounts'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=False, nullable=True)  # optional account code (deprecated)
    name = db.Column(db.String(100), nullable=False)
    account_type = db.Column(db.String(20), nullable=False)  # Asset, Liability, Equity, Income, Expense
    description = db.Column(db.Text)
    parent_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=True)  # Parent account for grouping
    opening_balance = db.Column(db.Float, default=0.0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    transaction_lines = db.relationship('TransactionLine', backref='account', lazy=True)
    children = db.relationship('Account', backref=db.backref('parent', remote_side=[id]), lazy=True)
    
    def __repr__(self):
        return f'<Account {self.name}>'
    
    def is_group(self):
        """Check if this account is a group (has children)"""
        return len(self.children) > 0
    
    def is_leaf(self):
        """Check if this is a leaf account (can have transactions)"""
        return len(self.children) == 0
    
    def get_all_descendants(self):
        """Get all child accounts recursively"""
        descendants = []
        for child in self.children:
            descendants.append(child)
            descendants.extend(child.get_all_descendants())
        return descendants

    def get_path(self):
        """Return full account path as 'TopLevel:Child:Leaf'"""
        parts = []
        node = self
        # Walk up to root
        while node is not None:
            parts.insert(0, node.name)
            node = node.parent
        return ':'.join(parts)

    def get_export_path(self):
        """Return account path prefixed with account type for importer/exporter interoperability: 'Asset:TopLevel:Child:Leaf'"""
        path = self.get_path()
        # Ensure account_type exists and is the first segment
        return f"{self.account_type}:{path}"    
    def get_balance(self, start_date=None, end_date=None):
        """Calculate account balance for a period (only for leaf accounts)"""
        query = TransactionLine.query.filter_by(account_id=self.id)
        
        if start_date:
            query = query.filter(TransactionLine.date >= start_date)
        if end_date:
            query = query.filter(TransactionLine.date <= end_date)
        
        lines = query.all()
        # Debits increase balance, credits decrease balance
        balance = sum((line.amount if (line.line_type or '').upper() == 'DEBIT' else -line.amount) for line in lines)
        # include opening balance
        balance += (self.opening_balance or 0.0)
        return balance
    
    def get_group_balance(self, start_date=None, end_date=None):
        """Calculate total balance for a group (sum of all descendants)"""
        total = self.get_balance(start_date, end_date)
        for child in self.children:
            total += child.get_group_balance(start_date, end_date)
        return total

class JournalEntry(db.Model):
    """Journal Entry header"""
    __tablename__ = 'journal_entries'
    
    id = db.Column(db.Integer, primary_key=True)
    entry_date = db.Column(db.Date, nullable=False, default=date.today)
    description = db.Column(db.String(255), nullable=False)
    reference = db.Column(db.String(50))  # Invoice/Check number, etc.
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    transaction_lines = db.relationship('TransactionLine', backref='journal_entry', lazy=True, cascade='all, delete-orphan')
    edit_logs = db.relationship('JournalEntryEditLog', backref='journal_entry', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<JournalEntry {self.id} - {self.entry_date}>'
    
    def is_balanced(self):
        """Check if debit equals credit"""
        total_debit = sum(line.amount for line in self.transaction_lines if line.line_type == 'DEBIT')
        total_credit = sum(line.amount for line in self.transaction_lines if line.line_type == 'CREDIT')
        return abs(total_debit - total_credit) < 0.01


class JournalEntryEditLog(db.Model):
    """Audit log for edits to JournalEntry"""
    __tablename__ = 'journal_entry_edit_logs'

    id = db.Column(db.Integer, primary_key=True)
    journal_entry_id = db.Column(db.Integer, db.ForeignKey('journal_entries.id'), nullable=False)
    editor = db.Column(db.String(100))  # username or identifier if available
    edited_at = db.Column(db.DateTime, default=datetime.utcnow)
    change_summary = db.Column(db.String(255))
    old_data = db.Column(db.Text)
    new_data = db.Column(db.Text)

    def __repr__(self):
        return f'<JournalEntryEditLog je={self.journal_entry_id} at {self.edited_at}>'

class TransactionLine(db.Model):
    """Individual transaction line (debit or credit)"""
    __tablename__ = 'transaction_lines'
    
    id = db.Column(db.Integer, primary_key=True)
    journal_entry_id = db.Column(db.Integer, db.ForeignKey('journal_entries.id'), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False)
    line_type = db.Column(db.String(10), nullable=False)  # 'DEBIT' or 'CREDIT'
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)
    description = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<TransactionLine {self.line_type} {self.amount} to {self.account.name}>'


class DailyAccountBalance(db.Model):
    """Daily net activity snapshot per account."""
    __tablename__ = 'daily_account_balance'

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, index=True)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False, index=True)
    balance = db.Column(db.Float, nullable=False, default=0.0)

    __table_args__ = (
        db.UniqueConstraint('date', 'account_id', name='uq_daily_account_balance_date_account'),
    )

    def __repr__(self):
        return f'<DailyAccountBalance {self.date} acc={self.account_id} bal={self.balance}>'


class MonthlyBudget(db.Model):
    """Monthly household budget settings."""
    __tablename__ = 'monthly_budget'

    id = db.Column(db.Integer, primary_key=True)
    month = db.Column(db.Date, nullable=False, unique=True, index=True)  # first day of month
    budget_amount = db.Column(db.Float, nullable=False, default=0.0)
    guchi_opening_balance = db.Column(db.Float, nullable=False, default=0.0)
    gunu_opening_balance = db.Column(db.Float, nullable=False, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<MonthlyBudget {self.month} budget={self.budget_amount}>'


class BudgetLineAssignment(db.Model):
    """Owner assignment for a transaction line in a given month."""
    __tablename__ = 'budget_line_assignment'

    id = db.Column(db.Integer, primary_key=True)
    month = db.Column(db.Date, nullable=False, index=True)  # first day of month
    transaction_line_id = db.Column(db.Integer, db.ForeignKey('transaction_lines.id'), nullable=False, index=True)
    owner = db.Column(db.String(10), nullable=False, default='None')  # Guchi, Gunu, None
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('month', 'transaction_line_id', name='uq_budget_month_line'),
    )

    def __repr__(self):
        return f'<BudgetLineAssignment month={self.month} line={self.transaction_line_id} owner={self.owner}>'


class BudgetEntryAssignment(db.Model):
    """Owner assignment for a journal entry in a given month."""
    __tablename__ = 'budget_entry_assignment'

    id = db.Column(db.Integer, primary_key=True)
    month = db.Column(db.Date, nullable=False, index=True)  # first day of month
    journal_entry_id = db.Column(db.Integer, db.ForeignKey('journal_entries.id'), nullable=False, index=True)
    owner = db.Column(db.String(10), nullable=False, default='None')  # Guchi, Gunu, None
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('month', 'journal_entry_id', name='uq_budget_month_entry'),
    )

    def __repr__(self):
        return f'<BudgetEntryAssignment month={self.month} entry={self.journal_entry_id} owner={self.owner}>'


class MonthlyNetWorth(db.Model):
    """Monthly net worth snapshot."""
    __tablename__ = 'monthly_networth'

    id = db.Column(db.Integer, primary_key=True)
    month = db.Column(db.Date, nullable=False, unique=True, index=True)  # first day of month
    assets = db.Column(db.Float, nullable=False, default=0.0)
    liabilities = db.Column(db.Float, nullable=False, default=0.0)
    networth = db.Column(db.Float, nullable=False, default=0.0)

    def __repr__(self):
        return f'<MonthlyNetWorth {self.month} net={self.networth}>'


class MonthlyPnL(db.Model):
    """Monthly profit & loss snapshot."""
    __tablename__ = 'monthly_pnl'

    id = db.Column(db.Integer, primary_key=True)
    month = db.Column(db.Date, nullable=False, unique=True, index=True)  # first day of month
    income = db.Column(db.Float, nullable=False, default=0.0)
    expense = db.Column(db.Float, nullable=False, default=0.0)
    profit = db.Column(db.Float, nullable=False, default=0.0)

    def __repr__(self):
        return f'<MonthlyPnL {self.month} profit={self.profit}>'
