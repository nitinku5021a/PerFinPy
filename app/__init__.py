from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config

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
            BudgetEntryAssignment
        )
        
        # Create tables
        db.create_all()

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
    from app.routes import main, transactions, reports, budget
    app.register_blueprint(main.bp)
    app.register_blueprint(transactions.bp)
    app.register_blueprint(reports.bp)
    app.register_blueprint(budget.bp)
    
    return app
