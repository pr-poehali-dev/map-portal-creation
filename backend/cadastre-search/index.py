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
    
    # PKK5 Rosreestr API для поиска участка
    pkk_search_url = f'https://pkk5.rosreestr.ru/api/features/1/{cadastral_number}'
    
    # Создаём SSL контекст
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    req = urllib.request.Request(
        pkk_search_url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Referer': 'https://pkk5.rosreestr.ru/'
        }
    )
    
    try:
        # Выполняем запрос к PKK5
        print(f'[DEBUG] Requesting: {pkk_search_url}')
        with urllib.request.urlopen(req, timeout=30, context=ssl_context) as response:
            response_text = response.read().decode('utf-8')
            print(f'[DEBUG] Response status: {response.status}')
            data = json.loads(response_text)
            
            # PKK5 возвращает объект с feature
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
            
            # Получаем extent для запроса геометрии
            extent = feature.get('extent')
            if not extent:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Координаты участка недоступны'})
                }
            
            # Запрашиваем геометрию
            geom_url = f'https://pkk5.rosreestr.ru/api/features/1/{cadastral_number}/geometry'
            geom_req = urllib.request.Request(
                geom_url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json',
                    'Referer': 'https://pkk5.rosreestr.ru/'
                }
            )
            
            with urllib.request.urlopen(geom_req, timeout=30, context=ssl_context) as geom_response:
                geom_data = json.loads(geom_response.read().decode('utf-8'))
                geometry = geom_data.get('geometry', {})
                
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
                
                # Формируем ответ из attrs PKK5
                result = {
                    'cadastral_number': cadastral_number,
                    'area': attrs.get('area_value'),
                    'category': attrs.get('category_type'),
                    'permitted_use': attrs.get('util_by_doc'),
                    'address': attrs.get('address'),
                    'cost': attrs.get('cad_cost'),
                    'date': attrs.get('date_create'),
                    'geometry': geometry,
                    'center': extent,
                    'raw_properties': attrs
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
        error_body = e.read().decode('utf-8') if e.fp else 'No response body'
        print(f'[ERROR] HTTP {e.code}: {error_body}')
        
        if e.code == 404:
            error_msg = 'Участок с таким кадастровым номером не найден'
        else:
            error_msg = f'Ошибка HTTP {e.code}: {error_body[:200]}'
        
        return {
            'statusCode': e.code,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': error_msg}, ensure_ascii=False)
        }
    
    except urllib.error.URLError as e:
        print(f'[ERROR] URLError: {str(e)}')
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Таймаут при запросе к ПКК. API Росреестра временно недоступен.'}, ensure_ascii=False)
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