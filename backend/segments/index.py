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
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
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
                FROM segments 
                ORDER BY order_index ASC
            ''')
            segments = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps([dict(s) for s in segments])
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            segments_data: List[Dict] = body.get('segments', [])
            
            # Update segments with new colors and order
            for idx, seg in enumerate(segments_data):
                seg_name = seg.get('name', '').strip()
                seg_color = seg.get('color', '#3B82F6')
                seg_id = seg.get('id')
                
                if seg_id:
                    # Update existing
                    cur.execute('''
                        UPDATE segments 
                        SET color = %s, order_index = %s 
                        WHERE id = %s
                    ''', (seg_color, idx, seg_id))
                else:
                    # Insert new
                    cur.execute('''
                        INSERT INTO segments (name, color, order_index) 
                        VALUES (%s, %s, %s)
                    ''', (seg_name, seg_color, idx))
            
            # Delete segments not in the list
            if segments_data:
                segment_ids = [s.get('id') for s in segments_data if s.get('id')]
                if segment_ids:
                    placeholders = ','.join(['%s'] * len(segment_ids))
                    cur.execute(f'''
                        DELETE FROM segments 
                        WHERE id NOT IN ({placeholders})
                    ''', segment_ids)
                else:
                    cur.execute('DELETE FROM segments')
            else:
                cur.execute('DELETE FROM segments')
            
            conn.commit()
            
            # Return updated list
            cur.execute('''
                SELECT id, name, color, order_index 
                FROM segments 
                ORDER BY order_index ASC
            ''')
            updated_segments = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps([dict(s) for s in updated_segments])
            }
        
        return {
            'statusCode': 405,
            'headers': headers,
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
