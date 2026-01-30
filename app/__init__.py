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
        from app.models import Account, JournalEntry, TransactionLine
        
        # Create tables
        db.create_all()
    
    # Register blueprints
    from app.routes import main, transactions, reports
    app.register_blueprint(main.bp)
    app.register_blueprint(transactions.bp)
    app.register_blueprint(reports.bp)
    
    return app
