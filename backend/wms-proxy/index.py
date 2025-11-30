'''
Business: Proxy WMS requests to NSPD with proper headers
Args: event with queryStringParameters (all WMS params)
Returns: PNG image tile
'''

import requests
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': 'Method not allowed'
        }
    
    params = event.get('queryStringParameters', {})
    bbox = params.get('BBOX', '')
    
    if not bbox:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': 'Missing BBOX parameter'
        }
    
    wms_url = 'https://nspd.gov.ru/api/aeggis/v4/36048/wms'
    
    wms_params = {
        'REQUEST': 'GetMap',
        'SERVICE': 'WMS',
        'VERSION': '1.3.0',
        'FORMAT': 'image/png',
        'STYLES': '',
        'TRANSPARENT': 'true',
        'LAYERS': '36048',
        'WIDTH': '256',
        'HEIGHT': '256',
        'CRS': 'EPSG:3857',
        'BBOX': bbox
    }
    
    headers = {
        'Referer': 'https://nspd.gov.ru/map?thematic=PKK&theme_id=1&is_copy_url=true&baseLayerId=&active_layers=36048',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'same-origin',
        'Origin': 'https://nspd.gov.ru',
        'Connection': 'keep-alive'
    }
    
    try:
        response = requests.get(wms_url, params=wms_params, headers=headers, timeout=10, verify=False)
        
        if response.status_code != 200:
            return {
                'statusCode': response.status_code,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': f'WMS error: {response.status_code}'
            }
        
        import base64
        image_base64 = base64.b64encode(response.content).decode('utf-8')
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=86400'
            },
            'isBase64Encoded': True,
            'body': image_base64
        }
    
    except requests.exceptions.Timeout:
        return {
            'statusCode': 504,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': 'Request timeout'
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': f'Error: {str(e)}'
        }