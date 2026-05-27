from datetime import datetime, date
from app import db
from enum import Enum
import json


class InvestmentCategory(Enum):
    EQUITY = "Equity"
    MUTUAL_FUNDS = "Mutual Funds"
    FIXED_INCOME = "Fixed Income"
    COMMODITY = "Commodity"

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


class ReminderTask(db.Model):
    """Recurring monthly reminder template."""
    __tablename__ = 'reminder_task'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    notes = db.Column(db.Text, nullable=True)
    due_day_of_month = db.Column(db.Integer, nullable=False)  # 1..31
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    occurrences = db.relationship(
        'ReminderOccurrence',
        backref='task',
        lazy=True,
        cascade='all, delete-orphan'
    )

    def __repr__(self):
        return f'<ReminderTask {self.id} {self.title}>'


class ReminderOccurrence(db.Model):
    """Per-month generated reminder instance."""
    __tablename__ = 'reminder_occurrence'

    id = db.Column(db.Integer, primary_key=True)
    reminder_task_id = db.Column(db.Integer, db.ForeignKey('reminder_task.id'), nullable=False, index=True)
    month = db.Column(db.Date, nullable=False, index=True)  # first day of month
    due_date = db.Column(db.Date, nullable=False)
    is_done = db.Column(db.Boolean, default=False, nullable=False)
    done_at = db.Column(db.DateTime, nullable=True)
    is_removed = db.Column(db.Boolean, default=False, nullable=False)
    removed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('reminder_task_id', 'month', name='uq_reminder_task_month'),
    )

    def __repr__(self):
        return f'<ReminderOccurrence task={self.reminder_task_id} month={self.month} done={self.is_done}>'


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


class GoalSetting(db.Model):
    """Global settings for goals page (interest rate)."""
    __tablename__ = 'goal_settings'

    id = db.Column(db.Integer, primary_key=True)
    interest_rate = db.Column(db.Float, nullable=False, default=0.0)  # annual % rate
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<GoalSetting id={self.id} rate={self.interest_rate}>'


class Goal(db.Model):
    """Savings/investment goals."""
    __tablename__ = 'goals'

    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(255), nullable=False)
    target_corpus = db.Column(db.Float, nullable=False, default=0.0)
    target_year = db.Column(db.Integer, nullable=False)
    current_corpus = db.Column(db.Float, nullable=False, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Goal {self.id} {self.description}>'


class CreditCard(db.Model):
    """Credit card reference data."""
    __tablename__ = 'credit_cards'

    id = db.Column(db.Integer, primary_key=True)
    card_name = db.Column(db.String(150), nullable=False)
    holder_name = db.Column(db.String(150), nullable=False)
    card_details = db.Column(db.Text, nullable=True)
    features_benefits = db.Column(db.Text, nullable=True)
    annual_fee = db.Column(db.Float, nullable=True)
    statement_day = db.Column(db.Integer, nullable=True)
    payment_day = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<CreditCard {self.id} {self.card_name}>'


class TradeSetup(db.Model):
    """Trading strategy/setup master data."""
    __tablename__ = 'trade_setups'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    start_date = db.Column(db.Date, nullable=False, index=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    entries = db.relationship(
        'TradeJournalEntry',
        backref='setup',
        lazy=True,
        cascade='all, delete-orphan'
    )

    def __repr__(self):
        return f'<TradeSetup {self.id} {self.name}>'


class TradeJournalEntry(db.Model):
    """Daily PnL log for an individual trading setup."""
    __tablename__ = 'trade_journal_entries'

    id = db.Column(db.Integer, primary_key=True)
    setup_id = db.Column(db.Integer, db.ForeignKey('trade_setups.id'), nullable=False, index=True)
    trade_date = db.Column(db.Date, nullable=False, index=True)
    capital_deployed = db.Column(db.Float, nullable=False, default=0.0)
    pnl_amount = db.Column(db.Float, nullable=False, default=0.0)
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('setup_id', 'trade_date', name='uq_trade_journal_setup_date'),
    )

    def __repr__(self):
        return f'<TradeJournalEntry setup={self.setup_id} date={self.trade_date} pnl={self.pnl_amount}>'


class FinancialFreedomClockSnapshot(db.Model):
    """Cached Financial Freedom Clock metrics."""
    __tablename__ = 'financial_freedom_clock_snapshot'

    id = db.Column(db.Integer, primary_key=True)
    target_months = db.Column(db.Integer, nullable=False, default=300)
    net_worth = db.Column(db.Float, nullable=True)
    monthly_expenses = db.Column(db.Float, nullable=True)
    monthly_saving = db.Column(db.Float, nullable=True)
    net_worth_change_last_month = db.Column(db.Float, nullable=True)
    months_funded = db.Column(db.Float, nullable=True)
    saving_coverage_pct = db.Column(db.Float, nullable=True)
    days_freedom_gained = db.Column(db.Float, nullable=True)
    freedom_progress_pct = db.Column(db.Float, nullable=True)
    updated_month = db.Column(db.Date, nullable=True)
    has_data = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<FinancialFreedomClockSnapshot id={self.id} updated_month={self.updated_month}>'


class DashboardPanelCache(db.Model):
    """Cached dashboard panel payloads (serialized JSON)."""
    __tablename__ = 'dashboard_panel_cache'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(80), nullable=False, unique=True, index=True)
    payload_json = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<DashboardPanelCache key={self.key}>'


class InvestmentAccount(db.Model):
    """Uploaded/manual investment tables grouped by category and account name."""
    __tablename__ = "investment_accounts"

    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(40), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    headers_json = db.Column(db.Text, nullable=False, default="[]")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    rows = db.relationship(
        "InvestmentRow",
        backref="account",
        lazy=True,
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        db.UniqueConstraint("category", "name", name="uq_investment_category_name"),
    )

    @property
    def headers(self):
        try:
            return json.loads(self.headers_json or "[]") or []
        except Exception:
            return []

    @headers.setter
    def headers(self, value):
        self.headers_json = json.dumps(value or [])

    def __repr__(self):
        return f"<InvestmentAccount {self.category}:{self.name}>"


class InvestmentRow(db.Model):
    """Row for an InvestmentAccount table (stored as JSON dict)."""
    __tablename__ = "investment_rows"

    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey("investment_accounts.id"), nullable=False, index=True)
    sort_index = db.Column(db.Integer, nullable=False, default=0, index=True)
    data_json = db.Column(db.Text, nullable=False, default="{}")
    mapping_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def data(self):
        try:
            return json.loads(self.data_json or "{}") or {}
        except Exception:
            return {}

    @data.setter
    def data(self, value):
        self.data_json = json.dumps(value or {})

    def __repr__(self):
        return f"<InvestmentRow {self.id} account={self.account_id}>"


class InvestmentInstrumentMapping(db.Model):
    """Mapping from (category, instrument) -> Asset leaf account for Combined sync."""
    __tablename__ = "investment_instrument_mappings"

    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(40), nullable=False, index=True)
    instrument = db.Column(db.String(200), nullable=False, index=True)
    mapping_account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("category", "instrument", name="uq_investment_mapping_category_instrument"),
    )

    def __repr__(self):
        return f"<InvestmentInstrumentMapping {self.category}:{self.instrument}>"
