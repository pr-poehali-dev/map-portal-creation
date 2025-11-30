'''
Business: Fetch cadastral parcels GeoJSON by bounding box from Rosreestr ArcGIS
Args: event with queryStringParameters (bbox: west,south,east,north)
Returns: GeoJSON with cadastral parcels geometries
'''

import requests
import json
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
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    params = event.get('queryStringParameters', {})
    bbox = params.get('bbox', '')
    
    if not bbox:
        return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Missing bbox parameter'})
        }
    
    url = 'https://pkk.rosreestr.ru/arcgis/rest/services/PKK6/CadastreOriginal/MapServer/0/query'
    
    query_params = {
        'f': 'geojson',
        'geometry': bbox,
        'geometryType': 'esriGeometryEnvelope',
        'spatialRel': 'esriSpatialRelIntersects',
        'outFields': 'cn,id',
        'returnGeometry': 'true',
        'inSR': '4326',
        'outSR': '4326'
    }
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://pkk.rosreestr.ru/'
    }
    
    try:
        response = requests.get(url, params=query_params, headers=headers, timeout=15, verify=False)
        
        if response.status_code != 200:
            return {
                'statusCode': response.status_code,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'ArcGIS API error', 'status': response.status_code})
            }
        
        geojson = response.json()
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600'
            },
            'isBase64Encoded': False,
            'body': json.dumps(geojson)
        }
    
    except requests.exceptions.Timeout:
        return {
            'statusCode': 504,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Request timeout'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': str(e)})
        }