from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config

db = SQLAlchemy()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    db.init_app(app)

    # Formatter for Indian number grouping (lakhs, crores) - rounds to integer and formats with commas
    def format_inr(value):
        try:
            n = int(round(float(value)))
        except Exception:
            return value or ''
        sign = '-' if n < 0 else ''
        n = abs(n)
        s = str(n)
        if len(s) <= 3:
            return sign + s
        last3 = s[-3:]
        rest = s[:-3]
        parts = []
        while len(rest) > 2:
            parts.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            parts.insert(0, rest)
        formatted = ','.join(parts) + ',' + last3
        return sign + formatted

    def camelcase(s):
        """Display string in CamelCase (title case). For paths like 'Parent:Child', title each segment."""
        if s is None:
            return ''
        s = str(s).strip()
        if not s:
            return ''
        if ':' in s:
            return ':'.join((p.strip().title() for p in s.split(':')))
        return s.title()

    # Register jinja filters
    app.jinja_env.filters['inr'] = format_inr
    app.jinja_env.filters['abs'] = abs
    app.jinja_env.filters['camelcase'] = camelcase
    
    with app.app_context():
        # Import models
        from app.models import Account, JournalEntry, TransactionLine
        
        # Create tables
        db.create_all()
    
    # Register blueprints
    from app.routes import main, transactions, reports
    app.register_blueprint(main.bp)
    app.register_blueprint(transactions.bp)
    app.register_blueprint(reports.bp)
    
    return app
