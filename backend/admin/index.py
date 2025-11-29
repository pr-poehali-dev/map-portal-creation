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
                cur.execute("SELECT id, email, name, role, status, created_at FROM users ORDER BY created_at DESC")
                users = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(row) for row in users], default=json_serializer)
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
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
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
        
        elif method == 'DELETE':
            permission_id = event.get('queryStringParameters', {}).get('permission_id')
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
