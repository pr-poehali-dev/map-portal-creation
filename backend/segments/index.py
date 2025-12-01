'''
Business: Manage land plot segments with colors and order
Args: event with httpMethod, body; context with request_id
Returns: GET - list of segments, POST - updated segments
'''

import json
import os
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import psycopg2
from psycopg2.extras import RealDictCursor

@dataclass
class Segment:
    id: Optional[int]
    name: str
    color: str
    order_index: int

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'isBase64Encoded': False,
            'body': ''
        }
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
    
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'GET':
            cur.execute('''
                SELECT id, name, color, order_index 
                FROM t_p43707323_map_portal_creation.segments 
                ORDER BY order_index ASC
            ''')
            segments = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'isBase64Encoded': False,
                'body': json.dumps([dict(s) for s in segments])
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            
            # Check if it's bulk update (from SegmentManager) or single create (from Admin)
            if 'segments' in body:
                # Bulk update from SegmentManager
                segments_data: List[Dict] = body.get('segments', [])
                
                # Track segment names to keep
                segment_names_to_keep = []
                
                # Upsert segments with new colors and order
                for idx, seg in enumerate(segments_data):
                    seg_name = seg.get('name', '').strip()
                    seg_color = seg.get('color', '#3B82F6')
                    seg_id = seg.get('id')
                    
                    segment_names_to_keep.append(seg_name)
                    
                    if seg_id:
                        # Update existing by ID
                        cur.execute('''
                            UPDATE t_p43707323_map_portal_creation.segments 
                            SET name = %s, color = %s, order_index = %s 
                            WHERE id = %s
                        ''', (seg_name, seg_color, idx, seg_id))
                    else:
                        # Upsert by name
                        cur.execute('''
                            INSERT INTO t_p43707323_map_portal_creation.segments (name, color, order_index) 
                            VALUES (%s, %s, %s)
                            ON CONFLICT (name) DO UPDATE 
                            SET color = EXCLUDED.color, order_index = EXCLUDED.order_index
                        ''', (seg_name, seg_color, idx))
                
                # Delete segments not in the list by name
                if segment_names_to_keep:
                    placeholders = ','.join(['%s'] * len(segment_names_to_keep))
                    cur.execute(f'''
                        DELETE FROM t_p43707323_map_portal_creation.segments 
                        WHERE name NOT IN ({placeholders})
                    ''', segment_names_to_keep)
                else:
                    cur.execute('DELETE FROM t_p43707323_map_portal_creation.segments')
            else:
                # Single create from AdminSegmentsTab
                name = body.get('name', '').strip()
                color = body.get('color', '#3B82F6')
                order_index = body.get('order_index', 0)
                
                cur.execute('''
                    INSERT INTO t_p43707323_map_portal_creation.segments (name, color, order_index)
                    VALUES (%s, %s, %s)
                    RETURNING id
                ''', (name, color, order_index))
                new_id = cur.fetchone()['id']
            
            conn.commit()
            
            # Return updated list
            cur.execute('''
                SELECT id, name, color, order_index 
                FROM t_p43707323_map_portal_creation.segments 
                ORDER BY order_index ASC
            ''')
            updated_segments = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'isBase64Encoded': False,
                'body': json.dumps([dict(s) for s in updated_segments])
            }
        
        elif method == 'PUT':
            # Update single segment from AdminSegmentsTab
            body = json.loads(event.get('body', '{}'))
            seg_id = body.get('id')
            
            if not seg_id:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'ID required'})
                }
            
            # Build update query dynamically
            updates = []
            values = []
            if 'name' in body:
                updates.append('name = %s')
                values.append(body['name'])
            if 'color' in body:
                updates.append('color = %s')
                values.append(body['color'])
            if 'order_index' in body:
                updates.append('order_index = %s')
                values.append(body['order_index'])
            
            if updates:
                values.append(seg_id)
                cur.execute(f'''
                    UPDATE t_p43707323_map_portal_creation.segments
                    SET {', '.join(updates)}
                    WHERE id = %s
                ''', values)
                conn.commit()
            
            # Return updated list
            cur.execute('''
                SELECT id, name, color, order_index 
                FROM t_p43707323_map_portal_creation.segments 
                ORDER BY order_index ASC
            ''')
            updated_segments = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'isBase64Encoded': False,
                'body': json.dumps([dict(s) for s in updated_segments])
            }
        
        elif method == 'DELETE':
            # Delete single segment from AdminSegmentsTab
            params = event.get('queryStringParameters', {})
            seg_id = params.get('id')
            
            if not seg_id:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'ID required'})
                }
            
            cur.execute('''
                DELETE FROM t_p43707323_map_portal_creation.segments
                WHERE id = %s
            ''', (seg_id,))
            conn.commit()
            
            # Return updated list
            cur.execute('''
                SELECT id, name, color, order_index 
                FROM t_p43707323_map_portal_creation.segments 
                ORDER BY order_index ASC
            ''')
            updated_segments = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'isBase64Encoded': False,
                'body': json.dumps([dict(s) for s in updated_segments])
            }
        
        return {
            'statusCode': 405,
            'headers': headers,
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Method not allowed'})
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()