import json
import urllib.request
import urllib.error
from typing import Dict, Any

def normalize_cadastral_number(cn: str) -> str:
    """
    Normalize cadastral number by removing leading zeros after colons.
    Example: 77:01:0001001:1234 -> 77:1:1001:1234
    """
    parts = cn.split(':')
    return ':'.join([part.lstrip('0') or '0' for part in parts])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Загрузка геометрии земельного участка по кадастровому номеру из API Росреестра
    Args: event с queryStringParameters (cadastral_number)
    Returns: GeoJSON геометрия участка с атрибутами
    '''
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
            'body': '',
            'isBase64Encoded': False
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
    cadastral_number = params.get('cadastral_number', '').strip()
    
    if not cadastral_number:
        return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Кадастровый номер не указан'})
        }
    
    # Normalize cadastral number (remove leading zeros)
    normalized_cn = normalize_cadastral_number(cadastral_number)
    
    # Step 1: Search for cadastral object to get its ID
    search_url = f'https://pkk.rosreestr.ru/api/features/1?text={normalized_cn}'
    
    try:
        req = urllib.request.Request(
            search_url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        )
        
        with urllib.request.urlopen(req, timeout=15) as response:
            search_data = json.loads(response.read().decode('utf-8'))
        
        if not search_data.get('features'):
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': f'Участок с кадастровым номером {cadastral_number} не найден'})
            }
        
        # Get object ID
        object_id = search_data['features'][0]['attrs']['id']
        
        # Step 2: Get detailed info with geometry
        detail_url = f'https://pkk.rosreestr.ru/api/features/1/{object_id}'
        
        req = urllib.request.Request(
            detail_url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        )
        
        with urllib.request.urlopen(req, timeout=15) as response:
            detail_data = json.loads(response.read().decode('utf-8'))
        
        feature = detail_data.get('feature', {})
        attrs = feature.get('attrs', {})
        geometry = feature.get('extent', {})
        
        # Extract attributes
        result = {
            'cadastral_number': attrs.get('cn', cadastral_number),
            'area': attrs.get('area_value', 0),
            'category': attrs.get('category_type', ''),
            'permitted_use': attrs.get('util_by_doc', ''),
            'address': attrs.get('address', ''),
            'cost': attrs.get('cad_cost', 0),
            'date': attrs.get('date_create', ''),
            'geometry': {
                'type': geometry.get('type', 'Polygon'),
                'coordinates': geometry.get('coordinates', [])
            }
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps(result, ensure_ascii=False)
        }
        
    except urllib.error.HTTPError as e:
        error_msg = f'Ошибка HTTP {e.code}'
        if e.code == 403:
            error_msg = 'Доступ заблокирован. Попробуйте позже или используйте Telegram бот @pkk2kml_bot'
        
        return {
            'statusCode': e.code,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': error_msg})
        }
        
    except urllib.error.URLError as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': f'Ошибка соединения: {str(e.reason)}'})
        }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'API вернул некорректный ответ'})
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': f'Неожиданная ошибка: {str(e)}'})
        }
