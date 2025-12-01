import json
import urllib.request
import urllib.error
import ssl
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
    
    # Публичный API ПКК Росреестра (type=1 для земельных участков)
    pkk_url = f'https://pkk.rosreestr.ru/api/features/1/{cadastral_number}'
    
    # Создаём контекст SSL который игнорирует проверку сертификатов
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    req = urllib.request.Request(
        pkk_url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://pkk.rosreestr.ru/'
        }
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15, context=ssl_context) as response:
            if response.status != 200:
                return {
                    'statusCode': response.status,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': f'Ошибка API Росреестра: {response.status}'})
                }
            
            data = json.loads(response.read().decode('utf-8'))
            
            # Проверяем наличие данных
            if not data or 'feature' not in data:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Участок не найден в ПКК'})
                }
            
            feature = data['feature']
            attrs = feature.get('attrs', {})
            
            # Формируем ответ с удобной структурой
            result = {
                'cadastral_number': cadastral_number,
                'area': attrs.get('area_value'),  # Площадь в кв.м
                'category': attrs.get('category_type'),  # Категория земель
                'permitted_use': attrs.get('util_by_doc'),  # Разрешённое использование
                'address': attrs.get('address'),
                'cost': attrs.get('cad_cost'),  # Кадастровая стоимость
                'date': attrs.get('date_create'),  # Дата постановки на учёт
                'geometry': feature.get('extent'),  # Координаты extent [minLon, minLat, maxLon, maxLat]
                'center': feature.get('center'),  # Центр [lon, lat]
                'raw_feature': feature  # Полные данные для отладки
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
