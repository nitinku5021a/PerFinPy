from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config
from sqlalchemy import inspect, text

db = SQLAlchemy()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    db.init_app(app)

    with app.app_context():
        # Import models
        from app.models import (
            Account,
            JournalEntry,
            TransactionLine,
            DailyAccountBalance,
            MonthlyNetWorth,
            MonthlyPnL,
            MonthlyBudget,
            BudgetLineAssignment,
            BudgetEntryAssignment,
            ReminderTask,
            ReminderOccurrence,
            GoalSetting,
            Goal,
            CreditCard,
            TradeSetup,
            TradeJournalEntry,
            FinancialFreedomClockSnapshot,
            DashboardPanelCache,
            InvestmentAccount,
            InvestmentRow
            ,
            InvestmentInstrumentMapping
        )
        
        # Create tables
        db.create_all()
        _ensure_credit_cards_schema()
        _ensure_investments_schema()

        # Register snapshot listeners
        from app.services import snapshots_service
        snapshots_service.register_snapshot_listeners(db)

        # Auto-backfill snapshots if transactions exist but snapshots are missing
        try:
            has_transactions = db.session.query(TransactionLine.id).first() is not None
            has_daily = db.session.query(DailyAccountBalance.id).first() is not None
            has_monthly_nw = db.session.query(MonthlyNetWorth.id).first() is not None
            has_monthly_pnl = db.session.query(MonthlyPnL.id).first() is not None
            if has_transactions and not (has_daily and has_monthly_nw and has_monthly_pnl):
                snapshots_service.backfill_snapshots(db.session)
        except Exception:
            db.session.rollback()
    
    # Register blueprints
    from app.routes import main, transactions, reports, budget, reminders, goals, credit_cards, trade_journal, investments
    app.register_blueprint(main.bp)
    app.register_blueprint(transactions.bp)
    app.register_blueprint(reports.bp)
    app.register_blueprint(budget.bp)
    app.register_blueprint(reminders.bp)
    app.register_blueprint(goals.bp)
    app.register_blueprint(credit_cards.bp)
    app.register_blueprint(trade_journal.bp)
    app.register_blueprint(investments.bp)
    
    return app


def _ensure_credit_cards_schema():
    inspector = inspect(db.engine)
    if 'credit_cards' not in inspector.get_table_names():
        return

    existing_columns = {col['name'] for col in inspector.get_columns('credit_cards')}
    if 'annual_fee' not in existing_columns:
        db.session.execute(text('ALTER TABLE credit_cards ADD COLUMN annual_fee FLOAT'))
        db.session.commit()


def _ensure_investments_schema():
    inspector = inspect(db.engine)
    if 'investment_rows' not in inspector.get_table_names():
        return

    existing_columns = {col['name'] for col in inspector.get_columns('investment_rows')}
    if 'mapping_account_id' not in existing_columns:
        db.session.execute(text('ALTER TABLE investment_rows ADD COLUMN mapping_account_id INTEGER'))
        db.session.commit()
