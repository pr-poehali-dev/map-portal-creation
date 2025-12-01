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
        # Используем публичный API egrp365.org
        api_url = f'https://egrp365.org/api/parcel/{cadastral_number}'
        
        print(f'[DEBUG] Requesting: {api_url}')
        response = session.get(api_url, timeout=20, verify=True)
        
        print(f'[DEBUG] Status: {response.status_code}')
        print(f'[DEBUG] Content-Type: {response.headers.get("Content-Type")}')
        print(f'[DEBUG] Response text (first 300): {response.text[:300]}')
        
        if response.status_code == 404:
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Участок не найден'}, ensure_ascii=False)
            }
        
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
        print(f'[DEBUG] Response keys: {list(data.keys()) if isinstance(data, dict) else "not a dict"}')
        
        # Проверяем наличие координат
        coords = data.get('coords') or data.get('coordinates') or []
        
        if not coords:
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Координаты участка недоступны'}, ensure_ascii=False)
            }
        
        # Конвертируем координаты в GeoJSON
        coordinates = []
        if isinstance(coords, list):
            for coord in coords:
                if isinstance(coord, (list, tuple)) and len(coord) >= 2:
                    lat, lng = coord[0], coord[1]
                    if abs(lat) > 90:
                        lng, lat = lat, lng
                    coordinates.append([float(lng), float(lat)])
                elif isinstance(coord, dict):
                    lat = coord.get('lat') or coord.get('latitude') or coord.get('y')
                    lng = coord.get('lng') or coord.get('lon') or coord.get('longitude') or coord.get('x')
                    if lat and lng:
                        coordinates.append([float(lng), float(lat)])
        
        if not coordinates:
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Не удалось обработать координаты'}, ensure_ascii=False)
            }
        
        # Формируем GeoJSON geometry
        geometry = {
            'type': 'Polygon',
            'coordinates': [coordinates]
        }
        
        # Формируем ответ
        result = {
            'cadastral_number': cadastral_number,
            'area': data.get('area') or data.get('area_value'),
            'category': data.get('category') or data.get('category_type'),
            'permitted_use': data.get('permitted_use') or data.get('util_by_doc') or data.get('utilization'),
            'address': data.get('address') or data.get('location'),
            'cost': data.get('cost') or data.get('cadastral_cost') or data.get('cad_cost'),
            'date': data.get('date') or data.get('date_create') or data.get('date_created'),
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
    
    except requests.exceptions.JSONDecodeError as e:
        print(f'[ERROR] JSON decode error: {str(e)}')
        print(f'[ERROR] Response text: {response.text[:500]}')
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'API вернул некорректный ответ. Попробуйте другой кадастровый номер.'}, ensure_ascii=False)
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