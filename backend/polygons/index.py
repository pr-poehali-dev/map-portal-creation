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
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
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
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(result), default=json_serializer)
                }
            else:
                cur.execute("SELECT * FROM polygon_objects ORDER BY created_at DESC")
                results = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(row) for row in results], default=json_serializer)
                }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            
            cur.execute(
                "INSERT INTO polygon_objects (id, name, type, area, population, status, coordinates, color, layer, visible, attributes) "
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
                "'" + json.dumps(body.get('attributes', {})).replace("'", "''") + "') "
                "RETURNING *"
            )
            result = cur.fetchone()
            conn.commit()
            
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
            
            if not result:
                conn.rollback()
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Polygon not found'})
                }
            
            conn.commit()
            
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
                "DELETE FROM polygon_objects WHERE id = '" + polygon_id.replace("'", "''") + "' RETURNING id"
            )
            result = cur.fetchone()
            
            if not result:
                conn.rollback()
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Polygon not found'})
                }
            
            conn.commit()
            
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