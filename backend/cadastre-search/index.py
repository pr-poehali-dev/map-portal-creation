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
    
    # НСПД Geoportal API для поиска участка (thematicSearchId=1 для земельных участков)
    nspd_search_url = f'https://nspd.gov.ru/api/geoportal/v2/search/geoportal'
    
    # Создаём SSL контекст
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    # Параметры поиска
    search_params = {
        'thematicSearchId': '1',
        'query': cadastral_number
    }
    
    search_url_with_params = f"{nspd_search_url}?{'&'.join([f'{k}={v}' for k, v in search_params.items()])}"
    
    req = urllib.request.Request(
        search_url_with_params,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'ru-RU,ru;q=0.9',
            'Referer': 'https://nspd.gov.ru/'
        }
    )
    
    try:
        # Выполняем поиск
        with urllib.request.urlopen(req, timeout=15, context=ssl_context) as response:
            search_data = json.loads(response.read().decode('utf-8'))
            
            # Geoportal API возвращает массив results
            if not search_data or not isinstance(search_data, dict):
                return {
                    'statusCode': 404,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Участок не найден в НСПД'})
                }
            
            results = search_data.get('results', [])
            if not results or len(results) == 0:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Участок не найден в НСПД'})
                }
            
            # Первый результат
            item = results[0]
            
            # Получаем ID объекта для запроса детальной информации
            object_id = item.get('id')
            if not object_id:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'ID объекта не найден'})
                }
            
            # Запрашиваем полную информацию об объекте включая геометрию
            detail_url = f'https://nspd.gov.ru/api/geoportal/v2/features/{object_id}'
            detail_req = urllib.request.Request(
                detail_url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'ru-RU,ru;q=0.9',
                    'Referer': 'https://nspd.gov.ru/'
                }
            )
            
            with urllib.request.urlopen(detail_req, timeout=15, context=ssl_context) as detail_response:
                detail_data = json.loads(detail_response.read().decode('utf-8'))
                
                props = detail_data.get('properties', {})
                geometry = detail_data.get('geometry', {})
                
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
                    'permitted_use': props.get('utilization') or props.get('permitted_use'),
                    'address': props.get('address') or props.get('location'),
                    'cost': props.get('cadastral_cost') or props.get('cost'),
                    'date': props.get('date_create') or props.get('date'),
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