import os
from datetime import date

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    """Base configuration"""
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        f"sqlite:///{os.path.join(basedir, 'accounting.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.environ.get('SECRET_KEY', 'change-this-secret-in-production')

    # Application settings
    APP_NAME = os.environ.get('APP_NAME', 'Personal Finance Accounting')
    DEFAULT_CURRENCY = os.environ.get('DEFAULT_CURRENCY', 'USD')
