from app import create_app
from app.models import Account
app = create_app()
with app.app_context():
    acc = Account.query.filter_by(name='House Rent').first()
    if acc:
        print('House Rent id', acc.id)
        client = app.test_client()
        resp = client.get(f'/reports/accounts/{acc.id}/entries')
        print('status', resp.status_code)
        print(resp.data.decode()[:1000])
    else:
        print('House Rent not found')
