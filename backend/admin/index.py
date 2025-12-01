import json
import os
from typing import Dict, Any, List, Optional
import psycopg2
import psycopg2.extras
from urllib.parse import parse_qs

def get_db_connection():
    '''Создаёт подключение к PostgreSQL базе данных'''
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        raise Exception('DATABASE_URL not configured')
    return psycopg2.connect(dsn)

def check_admin_access(user_id: str, conn) -> bool:
    '''Проверяет, является ли пользователь администратором'''
    if not user_id:
        return False
    
    with conn.cursor() as cur:
        cur.execute(
            "SELECT role FROM t_p43707323_map_portal_creation.users WHERE id = %s AND status = 'active'",
            (user_id,)
        )
        result = cur.fetchone()
        return result and result[0] == 'admin'

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API админ-панели для управления пользователями, компаниями, правами доступа
    Args: event с httpMethod, headers, queryStringParameters, body
    Returns: HTTP response с данными или результатом операции
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    headers = event.get('headers', {})
    user_id = headers.get('X-User-Id') or headers.get('x-user-id')
    
    try:
        conn = get_db_connection()
        
        if not check_admin_access(user_id, conn):
            conn.close()
            return {
                'statusCode': 403,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Access denied. Admin role required.'})
            }
        
        if method == 'GET':
            params = event.get('queryStringParameters', {})
            action = params.get('action', '')
            
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                if action == 'users':
                    cur.execute('''
                        SELECT u.id, u.email, u.name, u.role, u.status, u.phone, u.position, 
                               u.company_id, c.name as company_name, u.created_at
                        FROM t_p43707323_map_portal_creation.users u
                        LEFT JOIN t_p43707323_map_portal_creation.companies c ON u.company_id = c.id
                        ORDER BY u.created_at DESC
                    ''')
                    result = cur.fetchall()
                
                elif action == 'companies':
                    cur.execute('''
                        SELECT id, name, description, inn, address, phone, email, website, status, created_at, updated_at
                        FROM t_p43707323_map_portal_creation.companies
                        ORDER BY created_at DESC
                    ''')
                    result = cur.fetchall()
                
                elif action == 'permissions':
                    cur.execute('''
                        SELECT p.id, p.user_id, p.resource_type, p.resource_id, p.permission_level, p.created_at,
                               u.name as user_name, u.email as user_email
                        FROM t_p43707323_map_portal_creation.permissions p
                        LEFT JOIN t_p43707323_map_portal_creation.users u ON p.user_id = u.id
                        ORDER BY p.created_at DESC
                    ''')
                    result = cur.fetchall()
                
                elif action == 'audit':
                    limit = int(params.get('limit', 50))
                    cur.execute('''
                        SELECT a.id, a.user_id, a.action, a.resource_type, a.resource_id, a.details, a.created_at,
                               u.name, u.email
                        FROM t_p43707323_map_portal_creation.audit_log a
                        LEFT JOIN t_p43707323_map_portal_creation.users u ON a.user_id = u.id
                        ORDER BY a.created_at DESC
                        LIMIT %s
                    ''', (limit,))
                    result = cur.fetchall()
                
                elif action == 'layers':
                    result = []
                
                elif action == 'attributes':
                    cur.execute('''
                        SELECT id, name, field_type, is_required, default_value, options, sort_order
                        FROM t_p43707323_map_portal_creation.attribute_templates
                        ORDER BY sort_order
                    ''')
                    result = cur.fetchall()
                
                elif action == 'beneficiaries':
                    cur.execute('''
                        SELECT id, name, created_at, updated_at
                        FROM t_p43707323_map_portal_creation.beneficiaries
                        ORDER BY name
                    ''')
                    result = cur.fetchall()
                
                else:
                    conn.close()
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': 'Unknown action'})
                    }
            
            conn.close()
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(result, default=str, ensure_ascii=False)
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action', '')
            
            with conn.cursor() as cur:
                if action == 'update_role':
                    user_target_id = body.get('user_id')
                    new_role = body.get('role')
                    
                    cur.execute(
                        "UPDATE t_p43707323_map_portal_creation.users SET role = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                        (new_role, user_target_id)
                    )
                    
                    cur.execute(
                        "INSERT INTO t_p43707323_map_portal_creation.audit_log (user_id, action, resource_type, resource_id, details) VALUES (%s, 'update_object', 'user', %s, %s)",
                        (user_id, user_target_id, json.dumps({'field': 'role', 'new_value': new_role}))
                    )
                    conn.commit()
                    result = {'success': True}
                
                elif action == 'update_status':
                    user_target_id = body.get('user_id')
                    new_status = body.get('status')
                    
                    cur.execute(
                        "UPDATE t_p43707323_map_portal_creation.users SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                        (new_status, user_target_id)
                    )
                    
                    cur.execute(
                        "INSERT INTO t_p43707323_map_portal_creation.audit_log (user_id, action, resource_type, resource_id, details) VALUES (%s, 'update_object', 'user', %s, %s)",
                        (user_id, user_target_id, json.dumps({'field': 'status', 'new_value': new_status}))
                    )
                    conn.commit()
                    result = {'success': True}
                
                elif action == 'create_company':
                    company_id = body.get('id')
                    cur.execute('''
                        INSERT INTO t_p43707323_map_portal_creation.companies 
                        (id, name, description, inn, address, phone, email, website, status, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ''', (
                        company_id, body.get('name'), body.get('description'), body.get('inn'),
                        body.get('address'), body.get('phone'), body.get('email'), body.get('website')
                    ))
                    
                    cur.execute(
                        "INSERT INTO t_p43707323_map_portal_creation.audit_log (user_id, action, resource_type, resource_id, details) VALUES (%s, 'create_object', 'company', %s, %s)",
                        (user_id, company_id, json.dumps({'name': body.get('name')}))
                    )
                    conn.commit()
                    result = {'success': True}
                
                elif action == 'update_company':
                    company_id = body.get('id')
                    cur.execute('''
                        UPDATE t_p43707323_map_portal_creation.companies 
                        SET name = %s, description = %s, inn = %s, address = %s, phone = %s, email = %s, website = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    ''', (
                        body.get('name'), body.get('description'), body.get('inn'),
                        body.get('address'), body.get('phone'), body.get('email'), body.get('website'), company_id
                    ))
                    
                    cur.execute(
                        "INSERT INTO t_p43707323_map_portal_creation.audit_log (user_id, action, resource_type, resource_id, details) VALUES (%s, 'update_object', 'company', %s, %s)",
                        (user_id, company_id, json.dumps({'name': body.get('name')}))
                    )
                    conn.commit()
                    result = {'success': True}
                
                elif action == 'grant_permission':
                    cur.execute('''
                        INSERT INTO t_p43707323_map_portal_creation.permissions 
                        (user_id, resource_type, resource_id, permission_level, created_at)
                        VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                    ''', (
                        body.get('user_id'), body.get('resource_type'),
                        body.get('resource_id'), body.get('permission_level')
                    ))
                    
                    cur.execute(
                        "INSERT INTO t_p43707323_map_portal_creation.audit_log (user_id, action, resource_type, resource_id, details) VALUES (%s, 'grant_permission', %s, %s, %s)",
                        (user_id, body.get('resource_type'), body.get('resource_id'), json.dumps({'target_user': body.get('user_id'), 'level': body.get('permission_level')}))
                    )
                    conn.commit()
                    result = {'success': True}
                
                elif action == 'create_attribute':
                    cur.execute('''
                        INSERT INTO t_p43707323_map_portal_creation.attribute_templates 
                        (name, field_type, is_required, default_value, options, sort_order, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ''', (
                        body.get('name'), body.get('field_type'), body.get('is_required', False),
                        body.get('default_value'), body.get('options'), body.get('sort_order', 0)
                    ))
                    conn.commit()
                    result = {'success': True}
                
                elif action == 'update_attribute':
                    cur.execute('''
                        UPDATE t_p43707323_map_portal_creation.attribute_templates 
                        SET name = %s, field_type = %s, is_required = %s, default_value = %s, options = %s, sort_order = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    ''', (
                        body.get('name'), body.get('field_type'), body.get('is_required'),
                        body.get('default_value'), body.get('options'), body.get('sort_order'), body.get('id')
                    ))
                    conn.commit()
                    result = {'success': True}
                
                elif action == 'reorder_attributes':
                    attributes = body.get('attributes', [])
                    for attr in attributes:
                        cur.execute(
                            "UPDATE t_p43707323_map_portal_creation.attribute_templates SET sort_order = %s WHERE id = %s",
                            (attr['sort_order'], attr['id'])
                        )
                    conn.commit()
                    result = {'success': True}
                
                elif action == 'create_beneficiary':
                    name = body.get('name')
                    if not name:
                        conn.close()
                        return {
                            'statusCode': 400,
                            'headers': {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            'body': json.dumps({'error': 'Name is required'})
                        }
                    
                    cur.execute(
                        "INSERT INTO t_p43707323_map_portal_creation.beneficiaries (name) VALUES (%s) RETURNING id",
                        (name,)
                    )
                    new_id = cur.fetchone()[0]
                    
                    cur.execute(
                        "INSERT INTO t_p43707323_map_portal_creation.audit_log (user_id, action, resource_type, resource_id, details) VALUES (%s, 'create', 'beneficiary', %s, %s)",
                        (user_id, str(new_id), json.dumps({'name': name}))
                    )
                    conn.commit()
                    result = {'success': True, 'id': new_id}
                
                elif action == 'delete_beneficiary':
                    name = body.get('name')
                    if not name:
                        conn.close()
                        return {
                            'statusCode': 400,
                            'headers': {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            'body': json.dumps({'error': 'Name is required'})
                        }
                    
                    cur.execute(
                        "DELETE FROM t_p43707323_map_portal_creation.beneficiaries WHERE name = %s RETURNING id",
                        (name,)
                    )
                    deleted_id = cur.fetchone()
                    
                    if deleted_id:
                        cur.execute(
                            "INSERT INTO t_p43707323_map_portal_creation.audit_log (user_id, action, resource_type, resource_id, details) VALUES (%s, 'delete', 'beneficiary', %s, %s)",
                            (user_id, str(deleted_id[0]), json.dumps({'name': name}))
                        )
                    
                    conn.commit()
                    result = {'success': True}
                
                else:
                    conn.close()
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': 'Unknown action'})
                    }
            
            conn.close()
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(result)
            }
        
        elif method == 'DELETE':
            params = event.get('queryStringParameters', {})
            
            with conn.cursor() as cur:
                if 'company_id' in params:
                    company_id = params['company_id']
                    cur.execute(
                        "DELETE FROM t_p43707323_map_portal_creation.companies WHERE id = %s",
                        (company_id,)
                    )
                    cur.execute(
                        "INSERT INTO t_p43707323_map_portal_creation.audit_log (user_id, action, resource_type, resource_id, details) VALUES (%s, 'delete_object', 'company', %s, '{}')",
                        (user_id, company_id)
                    )
                    conn.commit()
                
                elif 'permission_id' in params:
                    permission_id = params['permission_id']
                    cur.execute(
                        "SELECT user_id, resource_type, resource_id FROM t_p43707323_map_portal_creation.permissions WHERE id = %s",
                        (permission_id,)
                    )
                    perm = cur.fetchone()
                    
                    cur.execute(
                        "DELETE FROM t_p43707323_map_portal_creation.permissions WHERE id = %s",
                        (permission_id,)
                    )
                    
                    if perm:
                        cur.execute(
                            "INSERT INTO t_p43707323_map_portal_creation.audit_log (user_id, action, resource_type, resource_id, details) VALUES (%s, 'revoke_permission', %s, %s, %s)",
                            (user_id, perm[1], perm[2], json.dumps({'target_user': perm[0]}))
                        )
                    conn.commit()
                
                elif 'attribute_id' in params:
                    attribute_id = params['attribute_id']
                    cur.execute(
                        "DELETE FROM t_p43707323_map_portal_creation.attribute_templates WHERE id = %s",
                        (attribute_id,)
                    )
                    conn.commit()
                
                else:
                    conn.close()
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': 'Missing required parameter'})
                    }
            
            conn.close()
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'success': True})
            }
        
        else:
            conn.close()
            return {
                'statusCode': 405,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Method not allowed'})
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }