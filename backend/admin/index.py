import json
import os
from typing import Dict, Any
from decimal import Decimal
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

def json_serializer(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Административная панель управления пользователями и правами доступа
    Args: event - dict с httpMethod, body, queryStringParameters
          context - объект с атрибутами request_id
    Returns: HTTP response dict с данными администрирования
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Admin-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'DATABASE_URL not configured'})
        }
    
    admin_id = event.get('headers', {}).get('X-User-Id')
    if not admin_id:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Authentication required'})
        }
    
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("SELECT role FROM users WHERE id = '" + admin_id.replace("'", "''") + "'")
        admin = cur.fetchone()
        
        if not admin or admin['role'] != 'admin':
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Admin access required'})
            }
        
        if method == 'GET':
            action = event.get('queryStringParameters', {}).get('action')
            
            if action == 'users':
                cur.execute(
                    "SELECT u.id, u.email, u.name, u.role, u.status, u.phone, u.position, "
                    "u.company_id, u.created_at, c.name as company_name "
                    "FROM users u LEFT JOIN companies c ON u.company_id = c.id "
                    "ORDER BY u.created_at DESC"
                )
                users = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(row) for row in users], default=json_serializer)
                }
            
            elif action == 'companies':
                cur.execute("SELECT * FROM companies ORDER BY created_at DESC")
                companies = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(row) for row in companies], default=json_serializer)
                }
            
            elif action == 'permissions':
                user_id = event.get('queryStringParameters', {}).get('user_id')
                if user_id:
                    cur.execute(
                        "SELECT * FROM permissions WHERE user_id = '" + user_id.replace("'", "''") + "'"
                    )
                else:
                    cur.execute("SELECT * FROM permissions")
                
                permissions = cur.fetchall()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(row) for row in permissions], default=json_serializer)
                }
            
            elif action == 'audit':
                limit = event.get('queryStringParameters', {}).get('limit', '100')
                cur.execute(
                    "SELECT a.*, u.email, u.name FROM audit_log a "
                    "LEFT JOIN users u ON a.user_id = u.id "
                    "ORDER BY a.created_at DESC LIMIT " + limit
                )
                logs = cur.fetchall()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(row) for row in logs], default=json_serializer)
                }
            
            elif action == 'layers':
                cur.execute(
                    "SELECT DISTINCT layer, COUNT(*) as object_count, "
                    "array_agg(DISTINCT user_id) as owners "
                    "FROM polygon_objects GROUP BY layer"
                )
                layers = cur.fetchall()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(row) for row in layers], default=json_serializer)
                }
            
            elif action == 'attributes':
                cur.execute("SELECT * FROM attribute_templates ORDER BY sort_order ASC")
                attributes = cur.fetchall()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(row) for row in attributes], default=json_serializer)
                }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'create_company':
                company_id = body.get('id')
                name = body.get('name')
                description = body.get('description', '')
                inn = body.get('inn', '')
                address = body.get('address', '')
                phone = body.get('phone', '')
                email = body.get('email', '')
                website = body.get('website', '')
                
                cur.execute(
                    "INSERT INTO companies (id, name, description, inn, address, phone, email, website) "
                    "VALUES ('" + company_id.replace("'", "''") + "', "
                    "'" + name.replace("'", "''") + "', "
                    "'" + description.replace("'", "''") + "', "
                    "'" + inn.replace("'", "''") + "', "
                    "'" + address.replace("'", "''") + "', "
                    "'" + phone.replace("'", "''") + "', "
                    "'" + email.replace("'", "''") + "', "
                    "'" + website.replace("'", "''") + "') "
                    "RETURNING *"
                )
                result = cur.fetchone()
                
                cur.execute(
                    "INSERT INTO audit_log (user_id, action, resource_type, resource_id, details) "
                    "VALUES ('" + admin_id.replace("'", "''") + "', 'create_company', 'company', "
                    "'" + company_id.replace("'", "''") + "', 'Created company " + name + "')"
                )
                conn.commit()
                
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(result), default=json_serializer)
                }
            
            elif action == 'update_company':
                company_id = body.get('company_id')
                name = body.get('name')
                description = body.get('description', '')
                inn = body.get('inn', '')
                address = body.get('address', '')
                phone = body.get('phone', '')
                email = body.get('email', '')
                website = body.get('website', '')
                status = body.get('status')
                
                cur.execute(
                    "UPDATE companies SET name = '" + name.replace("'", "''") + "', "
                    "description = '" + description.replace("'", "''") + "', "
                    "inn = '" + inn.replace("'", "''") + "', "
                    "address = '" + address.replace("'", "''") + "', "
                    "phone = '" + phone.replace("'", "''") + "', "
                    "email = '" + email.replace("'", "''") + "', "
                    "website = '" + website.replace("'", "''") + "', "
                    "status = '" + status.replace("'", "''") + "', "
                    "updated_at = CURRENT_TIMESTAMP "
                    "WHERE id = '" + company_id.replace("'", "''") + "' RETURNING *"
                )
                result = cur.fetchone()
                
                cur.execute(
                    "INSERT INTO audit_log (user_id, action, resource_type, resource_id, details) "
                    "VALUES ('" + admin_id.replace("'", "''") + "', 'update_company', 'company', "
                    "'" + company_id.replace("'", "''") + "', 'Updated company " + name + "')"
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(result), default=json_serializer)
                }
            
            elif action == 'assign_company':
                user_id = body.get('user_id')
                company_id = body.get('company_id')
                
                cur.execute(
                    "UPDATE users SET company_id = '" + company_id.replace("'", "''") + "' "
                    "WHERE id = '" + user_id.replace("'", "''") + "' RETURNING id, email, name, company_id"
                )
                result = cur.fetchone()
                
                cur.execute(
                    "INSERT INTO audit_log (user_id, action, resource_type, resource_id, details) "
                    "VALUES ('" + admin_id.replace("'", "''") + "', 'assign_company', 'user', "
                    "'" + user_id.replace("'", "''") + "', 'Assigned to company " + company_id + "')"
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(result), default=json_serializer)
                }
            
            if action == 'update_role':
                user_id = body.get('user_id')
                new_role = body.get('role')
                
                cur.execute(
                    "UPDATE users SET role = '" + new_role.replace("'", "''") + "' "
                    "WHERE id = '" + user_id.replace("'", "''") + "' RETURNING id, email, name, role, status"
                )
                result = cur.fetchone()
                
                cur.execute(
                    "INSERT INTO audit_log (user_id, action, resource_type, resource_id, details) "
                    "VALUES ('" + admin_id.replace("'", "''") + "', 'update_role', 'user', "
                    "'" + user_id.replace("'", "''") + "', 'Changed role to " + new_role + "')"
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(result), default=json_serializer)
                }
            
            elif action == 'update_status':
                user_id = body.get('user_id')
                new_status = body.get('status')
                
                cur.execute(
                    "UPDATE users SET status = '" + new_status.replace("'", "''") + "' "
                    "WHERE id = '" + user_id.replace("'", "''") + "' RETURNING id, email, name, role, status"
                )
                result = cur.fetchone()
                
                cur.execute(
                    "INSERT INTO audit_log (user_id, action, resource_type, resource_id, details) "
                    "VALUES ('" + admin_id.replace("'", "''") + "', 'update_status', 'user', "
                    "'" + user_id.replace("'", "''") + "', 'Changed status to " + new_status + "')"
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(result), default=json_serializer)
                }
            
            elif action == 'grant_permission':
                user_id = body.get('user_id')
                resource_type = body.get('resource_type')
                resource_id = body.get('resource_id')
                permission_level = body.get('permission_level')
                
                cur.execute(
                    "INSERT INTO permissions (user_id, resource_type, resource_id, permission_level) "
                    "VALUES ('" + user_id.replace("'", "''") + "', "
                    "'" + resource_type.replace("'", "''") + "', "
                    "'" + (resource_id.replace("'", "''") if resource_id else '') + "', "
                    "'" + permission_level.replace("'", "''") + "') RETURNING *"
                )
                result = cur.fetchone()
                
                cur.execute(
                    "INSERT INTO audit_log (user_id, action, resource_type, resource_id, details) "
                    "VALUES ('" + admin_id.replace("'", "''") + "', 'grant_permission', "
                    "'" + resource_type.replace("'", "''") + "', '" + (resource_id or '') + "', "
                    "'Granted " + permission_level + " access to user " + user_id + "')"
                )
                conn.commit()
                
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(result), default=json_serializer)
                }
            
            elif action == 'create_attribute':
                name = body.get('name')
                field_type = body.get('field_type')
                is_required = body.get('is_required', False)
                default_value = body.get('default_value', '')
                options = body.get('options', '')
                sort_order = body.get('sort_order', 0)
                
                cur.execute(
                    "INSERT INTO attribute_templates (name, field_type, is_required, default_value, options, sort_order) "
                    "VALUES ('" + name.replace("'", "''") + "', "
                    "'" + field_type.replace("'", "''") + "', "
                    + str(is_required) + ", "
                    "'" + default_value.replace("'", "''") + "', "
                    "'" + options.replace("'", "''") + "', "
                    + str(sort_order) + ") RETURNING *"
                )
                result = cur.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(result), default=json_serializer)
                }
            
            elif action == 'update_attribute':
                attr_id = body.get('id')
                name = body.get('name')
                field_type = body.get('field_type')
                is_required = body.get('is_required', False)
                default_value = body.get('default_value', '')
                options = body.get('options', '')
                
                cur.execute(
                    "UPDATE attribute_templates SET "
                    "name = '" + name.replace("'", "''") + "', "
                    "field_type = '" + field_type.replace("'", "''") + "', "
                    "is_required = " + str(is_required) + ", "
                    "default_value = '" + default_value.replace("'", "''") + "', "
                    "options = '" + options.replace("'", "''") + "', "
                    "updated_at = CURRENT_TIMESTAMP "
                    "WHERE id = " + str(attr_id) + " RETURNING *"
                )
                result = cur.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(result), default=json_serializer)
                }
            
            elif action == 'reorder_attributes':
                attributes = body.get('attributes', [])
                
                for attr in attributes:
                    attr_id = attr.get('id')
                    sort_order = attr.get('sort_order')
                    cur.execute(
                        "UPDATE attribute_templates SET sort_order = " + str(sort_order) + 
                        " WHERE id = " + str(attr_id)
                    )
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True})
                }
        
        elif method == 'DELETE':
            permission_id = event.get('queryStringParameters', {}).get('permission_id')
            attribute_id = event.get('queryStringParameters', {}).get('attribute_id')
            
            if attribute_id:
                cur.execute("DELETE FROM attribute_templates WHERE id = " + str(attribute_id))
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'message': 'Attribute deleted'})
                }
            
            if not permission_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Permission ID required'})
                }
            
            cur.execute(
                "SELECT * FROM permissions WHERE id = " + permission_id
            )
            perm = cur.fetchone()
            
            if not perm:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Permission not found'})
                }
            
            cur.execute(
                "UPDATE permissions SET permission_level = 'revoked' WHERE id = " + permission_id
            )
            
            cur.execute(
                "INSERT INTO audit_log (user_id, action, resource_type, details) "
                "VALUES ('" + admin_id.replace("'", "''") + "', 'revoke_permission', 'permission', "
                "'Revoked permission ID " + permission_id + "')"
            )
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'message': 'Permission revoked'})
            }
        
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid action'})
        }
    
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()