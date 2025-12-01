import json
import urllib.request
import urllib.error
import ssl
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Загрузка геометрии земельного участка по кадастровому номеру из НСПД Геопортала
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
    
    # НСПД Геопортал API v5
    api_url = f'https://nspd.gov.ru/api/geoportal/v5/search/geoportal?thematicSearchId=1&query={cadastral_number}&CRS=EPSG:4326'
    
    # Create SSL context that doesn't verify certificates
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    try:
        req = urllib.request.Request(
            api_url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Referer': 'https://nspd.gov.ru/',
                'Origin': 'https://nspd.gov.ru'
            }
        )
        
        with urllib.request.urlopen(req, timeout=20, context=ssl_context) as response:
            response_data = json.loads(response.read().decode('utf-8'))
        
        # Check if results exist
        if not response_data.get('results') or len(response_data['results']) == 0:
            # Fallback to Telegram bot instruction
            result = {
                'error': 'not_available',
                'message': f'Участок {cadastral_number} не найден в НСПД',
                'instructions': {
                    'title': 'Как загрузить участок:',
                    'steps': [
                        '1. Откройте Telegram бот @pkk2kml_bot',
                        f'2. Отправьте боту кадастровый номер: {cadastral_number}',
                        '3. Бот вернёт файл в формате KML с границами участка',
                        '4. Вернитесь сюда и нажмите кнопку "Импорт данных" внизу',
                        '5. Выберите полученный KML файл — участок появится на карте'
                    ]
                },
                'cadastral_number': cadastral_number,
                'telegram_bot': '@pkk2kml_bot',
                'telegram_link': 'https://t.me/pkk2kml_bot',
                'pkk_link': f'https://pkk.rosreestr.ru/#/search/{cadastral_number}'
            }
            
            return {
                'statusCode': 503,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': False,
                'body': json.dumps(result, ensure_ascii=False)
            }
        
        # Extract first result
        feature = response_data['results'][0]
        
        # Extract geometry
        geometry = feature.get('geometry', {})
        
        # Extract attributes from properties
        properties = feature.get('properties', {})
        
        # Parse area from properties
        area = 0
        if 'area' in properties:
            area = float(properties['area'])
        elif 'Площадь' in properties:
            area = float(properties['Площадь'])
        
        result = {
            'cadastral_number': cadastral_number,
            'area': area,
            'category': properties.get('category', properties.get('Категория земель', '')),
            'permitted_use': properties.get('permitted_use', properties.get('Разрешенное использование', '')),
            'address': properties.get('address', properties.get('Адрес', '')),
            'cost': properties.get('cost', properties.get('Кадастровая стоимость', 0)),
            'date': properties.get('date', properties.get('Дата постановки на учет', '')),
            'geometry': geometry
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
        error_body = e.read().decode('utf-8', errors='ignore') if e.fp else ''
        
        # Fallback to Telegram bot instruction
        result = {
            'error': 'not_available',
            'message': f'API НСПД временно недоступен (HTTP {e.code})',
            'instructions': {
                'title': 'Как загрузить участок:',
                'steps': [
                    '1. Откройте Telegram бот @pkk2kml_bot',
                    f'2. Отправьте боту кадастровый номер: {cadastral_number}',
                    '3. Бот вернёт файл в формате KML с границами участка',
                    '4. Вернитесь сюда и нажмите кнопку "Импорт данных" внизу',
                    '5. Выберите полученный KML файл — участок появится на карте'
                ]
            },
            'cadastral_number': cadastral_number,
            'telegram_bot': '@pkk2kml_bot',
            'telegram_link': 'https://t.me/pkk2kml_bot',
            'pkk_link': f'https://pkk.rosreestr.ru/#/search/{cadastral_number}'
        }
        
        return {
            'statusCode': 503,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps(result, ensure_ascii=False)
        }
        
    except Exception as e:
        # Fallback to Telegram bot instruction
        result = {
            'error': 'not_available',
            'message': f'Не удалось загрузить участок: {str(e)}',
            'instructions': {
                'title': 'Как загрузить участок:',
                'steps': [
                    '1. Откройте Telegram бот @pkk2kml_bot',
                    f'2. Отправьте боту кадастровый номер: {cadastral_number}',
                    '3. Бот вернёт файл в формате KML с границами участка',
                    '4. Вернитесь сюда и нажмите кнопку "Импорт данных" внизу',
                    '5. Выберите полученный KML файл — участок появится на карте'
                ]
            },
            'cadastral_number': cadastral_number,
            'telegram_bot': '@pkk2kml_bot',
            'telegram_link': 'https://t.me/pkk2kml_bot',
            'pkk_link': f'https://pkk.rosreestr.ru/#/search/{cadastral_number}'
        }
        
        return {
            'statusCode': 503,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps(result, ensure_ascii=False)
        }