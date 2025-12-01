import json
import requests
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Загрузка геометрии и данных земельного участка по кадастровому номеру из ПКК Росреестра
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
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
    })
    
    try:
        # Используем публичный API rosreestr.net
        api_url = f'https://rosreestr.net/api/online/parcel/{cadastral_number}'
        
        print(f'[DEBUG] Requesting: {api_url}')
        response = session.get(api_url, timeout=25, verify=False)
        
        if response.status_code != 200:
            print(f'[ERROR] Status {response.status_code}: {response.text[:200]}')
            return {
                'statusCode': response.status_code,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': f'Ошибка API: {response.status_code}'}, ensure_ascii=False)
            }
        
        data = response.json()
        print(f'[DEBUG] Response keys: {list(data.keys())}')
        
        if not data or 'error' in data:
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Участок не найден'})
            }
        
        # Получаем координаты
        coordinates_raw = data.get('coordinates', [])
        if not coordinates_raw:
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Координаты участка недоступны'})
            }
        
        # Конвертируем координаты в GeoJSON формат
        coordinates = []
        for coord in coordinates_raw:
            if isinstance(coord, dict) and 'lat' in coord and 'lng' in coord:
                coordinates.append([float(coord['lng']), float(coord['lat'])])
        
        if not coordinates:
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Не удалось обработать координаты'})
            }
        
        # Формируем GeoJSON geometry
        geometry = {
            'type': 'Polygon',
            'coordinates': [coordinates]
        }
        
        # Формируем ответ
        result = {
            'cadastral_number': cadastral_number,
            'area': data.get('area'),
            'category': data.get('category'),
            'permitted_use': data.get('permitted_use'),
            'address': data.get('address'),
            'cost': data.get('cadastral_cost'),
            'date': data.get('date_created'),
            'geometry': geometry,
            'raw_properties': data
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
            
    except requests.exceptions.Timeout:
        print('[ERROR] Request timeout')
        return {
            'statusCode': 504,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Таймаут запроса. API Росреестра не отвечает.'}, ensure_ascii=False)
        }
    
    except requests.exceptions.RequestException as e:
        print(f'[ERROR] Request exception: {str(e)}')
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': f'Ошибка соединения: {str(e)}'}, ensure_ascii=False)
        }
    
    except Exception as e:
        print(f'[ERROR] Exception: {str(e)}')
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': f'Ошибка: {str(e)}'}, ensure_ascii=False)
        }
