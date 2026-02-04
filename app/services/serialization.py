def isoformat_or_none(value):
    if value is None:
        return None
    return value.isoformat()


def account_to_dict(acc):
    return {
        'id': acc.id,
        'name': acc.name,
        'account_type': acc.account_type,
        'path': acc.get_path(),
        'export_path': acc.get_export_path(),
        'parent_id': acc.parent_id,
        'opening_balance': acc.opening_balance,
        'is_active': acc.is_active
    }


def line_to_dict(line):
    return {
        'id': line.id,
        'account_id': line.account_id,
        'account_name': line.account.name if line.account else None,
        'line_type': line.line_type,
        'amount': line.amount,
        'date': isoformat_or_none(line.date),
        'description': line.description
    }


def entry_to_dict(entry, include_lines=False):
    payload = {
        'id': entry.id,
        'entry_date': isoformat_or_none(entry.entry_date),
        'description': entry.description,
        'reference': entry.reference,
        'notes': entry.notes,
        'created_at': isoformat_or_none(entry.created_at)
    }
    if include_lines:
        payload['lines'] = [line_to_dict(l) for l in entry.transaction_lines]
    return payload


def tree_to_dict(tree):
    def _node_to_json(node):
        return {
            'account': account_to_dict(node['account']),
            'balance': node['balance'],
            'children': [_node_to_json(child) if 'children' in child else {
                'account': account_to_dict(child['account']),
                'balance': child['balance']
            } for child in node.get('children', [])]
        }
    return [_node_to_json(node) for node in tree]
