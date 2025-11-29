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

def check_permission(cur, user_id: str, resource_type: str, resource_id: str = None, required_level: str = 'read') -> bool:
    cur.execute("SELECT role FROM users WHERE id = '" + user_id.replace("'", "''") + "'")
    user = cur.fetchone()
    
    if not user:
        return False
    
    if user['role'] == 'admin':
        return True
    
    if resource_id:
        cur.execute(
            "SELECT permission_level FROM permissions WHERE user_id = '" + user_id.replace("'", "''") + "' "
            "AND resource_type = '" + resource_type.replace("'", "''") + "' "
            "AND (resource_id = '" + resource_id.replace("'", "''") + "' OR resource_id IS NULL) "
            "AND permission_level != 'revoked' ORDER BY resource_id DESC LIMIT 1"
        )
    else:
        cur.execute(
            "SELECT permission_level FROM permissions WHERE user_id = '" + user_id.replace("'", "''") + "' "
            "AND resource_type = '" + resource_type.replace("'", "''") + "' "
            "AND resource_id IS NULL AND permission_level != 'revoked' LIMIT 1"
        )
    
    perm = cur.fetchone()
    
    if not perm:
        if required_level == 'read':
            return user['role'] in ['editor', 'user']
        elif required_level == 'write':
            return user['role'] in ['editor', 'user']
        elif required_level == 'delete':
            return user['role'] in ['editor', 'admin']
        return True
    
    level = perm['permission_level']
    
    if required_level == 'read':
        return level in ['read', 'write', 'admin']
    elif required_level == 'write':
        return level in ['write', 'admin']
    elif required_level == 'delete':
        return level == 'admin'
    
    return False

def log_action(cur, conn, user_id: str, action: str, resource_type: str, resource_id: str = None, details: str = None):
    details_sql = "'" + details.replace("'", "''") + "'" if details else 'NULL'
    resource_id_sql = "'" + resource_id.replace("'", "''") + "'" if resource_id else 'NULL'
    
    cur.execute(
        "INSERT INTO audit_log (user_id, action, resource_type, resource_id, details) "
        "VALUES ('" + user_id.replace("'", "''") + "', '" + action.replace("'", "''") + "', "
        "'" + resource_type.replace("'", "''") + "', " + resource_id_sql + ", " + details_sql + ")"
    )
    conn.commit()

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: CRUD операции с полигональными объектами карты
    Args: event - dict с httpMethod, body, queryStringParameters, pathParams
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict с полигональными объектами или результатом операции
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
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
    
    user_id = event.get('headers', {}).get('X-User-Id')
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Authentication required'})
        }
    
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'GET':
            polygon_id = event.get('queryStringParameters', {}).get('id')
            
            if polygon_id:
                cur.execute(
                    "SELECT * FROM polygon_objects WHERE id = '" + polygon_id.replace("'", "''") + "'"
                )
                result = cur.fetchone()
                
                if not result:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Polygon not found'})
                    }
                
                if result['user_id'] != user_id:
                    if not check_permission(cur, user_id, 'layer', result['layer'], 'read'):
                        return {
                            'statusCode': 403,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'error': 'Access denied'})
                        }
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(result), default=json_serializer)
                }
            else:
                cur.execute("SELECT * FROM polygon_objects ORDER BY created_at DESC")
                all_results = cur.fetchall()
                
                filtered_results = []
                for row in all_results:
                    if row['user_id'] == user_id:
                        filtered_results.append(dict(row))
                    elif check_permission(cur, user_id, 'layer', row['layer'], 'read'):
                        filtered_results.append(dict(row))
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(filtered_results, default=json_serializer)
                }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            layer = body['layer']
            
            if not check_permission(cur, user_id, 'layer', layer, 'write'):
                return {
                    'statusCode': 403,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'No permission to create objects in this layer'})
                }
            
            print(f"DEBUG: Creating polygon with data: id={body['id']}, name={body['name']}, area={body['area']}, type={body['type']}")
            
            sql_query = (
                "INSERT INTO polygon_objects (id, name, type, area, population, status, coordinates, color, layer, visible, attributes, user_id) "
                "VALUES ('" + body['id'].replace("'", "''") + "', "
                "'" + body['name'].replace("'", "''") + "', "
                "'" + body['type'].replace("'", "''") + "', "
                "" + str(body['area']) + ", "
                "" + (str(body['population']) if body.get('population') else 'NULL') + ", "
                "'" + body['status'].replace("'", "''") + "', "
                "'" + json.dumps(body['coordinates']).replace("'", "''") + "', "
                "'" + body['color'].replace("'", "''") + "', "
                "'" + body['layer'].replace("'", "''") + "', "
                "" + str(body.get('visible', True)).lower() + ", "
                "'" + json.dumps(body.get('attributes', {})).replace("'", "''") + "', "
                "'" + user_id.replace("'", "''") + "') "
                "RETURNING *"
            )
            
            print(f"DEBUG SQL: {sql_query[:500]}")
            
            cur.execute(sql_query)
            result = cur.fetchone()
            conn.commit()
            
            log_action(cur, conn, user_id, 'create_object', 'polygon', result['id'], 'Created ' + body['name'])
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(dict(result), default=json_serializer)
            }
        
        elif method == 'PUT':
            polygon_id = event.get('queryStringParameters', {}).get('id')
            if not polygon_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Polygon ID required'})
                }
            
            cur.execute(
                "SELECT user_id, layer FROM polygon_objects WHERE id = '" + polygon_id.replace("'", "''") + "'"
            )
            existing = cur.fetchone()
            
            if not existing:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Polygon not found'})
                }
            
            if existing['user_id'] != user_id:
                if not check_permission(cur, user_id, 'layer', existing['layer'], 'write'):
                    return {
                        'statusCode': 403,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'No permission to edit this object'})
                    }
            
            body = json.loads(event.get('body', '{}'))
            
            cur.execute(
                "UPDATE polygon_objects SET "
                "name = '" + body['name'].replace("'", "''") + "', "
                "type = '" + body['type'].replace("'", "''") + "', "
                "area = " + str(body['area']) + ", "
                "population = " + (str(body['population']) if body.get('population') else 'NULL') + ", "
                "status = '" + body['status'].replace("'", "''") + "', "
                "coordinates = '" + json.dumps(body['coordinates']).replace("'", "''") + "', "
                "color = '" + body['color'].replace("'", "''") + "', "
                "layer = '" + body['layer'].replace("'", "''") + "', "
                "visible = " + str(body.get('visible', True)).lower() + ", "
                "attributes = '" + json.dumps(body.get('attributes', {})).replace("'", "''") + "', "
                "updated_at = CURRENT_TIMESTAMP "
                "WHERE id = '" + polygon_id.replace("'", "''") + "' "
                "RETURNING *"
            )
            result = cur.fetchone()
            conn.commit()
            
            log_action(cur, conn, user_id, 'update_object', 'polygon', polygon_id, 'Updated ' + body['name'])
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(dict(result), default=json_serializer)
            }
        
        elif method == 'DELETE':
            polygon_id = event.get('queryStringParameters', {}).get('id')
            if not polygon_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Polygon ID required'})
                }
            
            cur.execute(
                "SELECT user_id, layer, name FROM polygon_objects WHERE id = '" + polygon_id.replace("'", "''") + "'"
            )
            existing = cur.fetchone()
            
            if not existing:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Polygon not found'})
                }
            
            if existing['user_id'] != user_id:
                cur.execute("SELECT role FROM users WHERE id = '" + user_id.replace("'", "''") + "'")
                user = cur.fetchone()
                
                if not user or user['role'] != 'admin':
                    if not check_permission(cur, user_id, 'layer', existing['layer'], 'delete'):
                        return {
                            'statusCode': 403,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'error': 'No permission to delete this object'})
                        }
            
            cur.execute(
                "DELETE FROM polygon_objects WHERE id = '" + polygon_id.replace("'", "''") + "' RETURNING id"
            )
            result = cur.fetchone()
            conn.commit()
            
            log_action(cur, conn, user_id, 'delete_object', 'polygon', polygon_id, 'Deleted ' + existing['name'])
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'message': 'Polygon deleted successfully', 'id': result['id']})
            }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()