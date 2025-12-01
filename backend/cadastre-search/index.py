import json
import urllib.request
import urllib.error
import ssl
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Загрузка геометрии и данных земельного участка по кадастровому номеру из НСПД
    Args: event с queryStringParameters (cadastral_number)
    Returns: GeoJSON с координатами границ, площадью, адресом, категорией земель
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
    
    # НСПД API для поиска участка
    nspd_search_url = f'https://nspd.gov.ru/api/regions/v4/searchByQuery'
    
    # Создаём SSL контекст
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    # Параметры поиска
    search_params = {
        'query': cadastral_number,
        'limit': 1,
        'types': 'land'
    }
    
    search_url_with_params = f"{nspd_search_url}?{'&'.join([f'{k}={v}' for k, v in search_params.items()])}"
    
    req = urllib.request.Request(
        search_url_with_params,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://nspd.gov.ru/map'
        }
    )
    
    try:
        # Выполняем поиск
        with urllib.request.urlopen(req, timeout=15, context=ssl_context) as response:
            search_data = json.loads(response.read().decode('utf-8'))
            
            if not search_data or not search_data.get('features'):
                return {
                    'statusCode': 404,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Участок не найден в НСПД'})
                }
            
            feature = search_data['features'][0]
            props = feature.get('properties', {})
            geometry = feature.get('geometry', {})
            
            if not geometry:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Геометрия участка недоступна'})
                }
            
            # Формируем ответ
            result = {
                'cadastral_number': cadastral_number,
                'area': props.get('area'),
                'category': props.get('category'),
                'permitted_use': props.get('utilization'),
                'address': props.get('address'),
                'cost': props.get('cadastral_cost'),
                'date': props.get('date_create'),
                'geometry': geometry,
                'center': props.get('center'),
                'raw_properties': props
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
        if e.code == 404:
            error_msg = 'Участок с таким кадастровым номером не найден'
        else:
            error_msg = f'Ошибка HTTP {e.code}'
        
        return {
            'statusCode': e.code,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': error_msg})
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': f'Ошибка: {str(e)}'})
        }
