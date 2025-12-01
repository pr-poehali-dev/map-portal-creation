import json
import os
from typing import Dict, Any
import urllib.request
import urllib.error

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Получение данных компании по ИНН из базы ЕГРЮЛ через Dadata API
    Args: event с httpMethod, queryStringParameters (inn)
    Returns: HTTP ответ с данными компании или ошибкой
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    # Получаем ИНН из параметров запроса
    params = event.get('queryStringParameters', {})
    inn: str = params.get('inn', '').strip()
    
    if not inn:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'ИНН не указан'}),
            'isBase64Encoded': False
        }
    
    # Проверяем формат ИНН (10 или 12 цифр)
    if not inn.isdigit() or len(inn) not in [10, 12]:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Некорректный формат ИНН'}),
            'isBase64Encoded': False
        }
    
    # Получаем API ключ из переменных окружения
    api_key = os.environ.get('DADATA_API_KEY')
    if not api_key:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'API ключ Dadata не настроен'}),
            'isBase64Encoded': False
        }
    
    # Формируем запрос к Dadata API
    url = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party'
    request_data = json.dumps({'query': inn}).encode('utf-8')
    
    req = urllib.request.Request(
        url,
        data=request_data,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Token {api_key}'
        }
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            response_data = json.loads(response.read().decode('utf-8'))
            
            if not response_data.get('suggestions'):
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Компания с таким ИНН не найдена'}),
                    'isBase64Encoded': False
                }
            
            # Извлекаем данные первой найденной компании
            suggestion = response_data['suggestions'][0]
            data = suggestion.get('data', {})
            
            # Формируем структурированный ответ
            company_data = {
                'inn': data.get('inn', ''),
                'kpp': data.get('kpp', ''),
                'ogrn': data.get('ogrn', ''),
                'name': data.get('name', {}).get('full_with_opf', ''),
                'short_name': data.get('name', {}).get('short_with_opf', ''),
                'address': data.get('address', {}).get('unrestricted_value', ''),
                'management': {
                    'name': data.get('management', {}).get('name', ''),
                    'post': data.get('management', {}).get('post', '')
                },
                'okved': data.get('okved', ''),
                'registration_date': data.get('state', {}).get('registration_date', ''),
                'status': data.get('state', {}).get('status', ''),
                'type': data.get('type', '')
            }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(company_data, ensure_ascii=False),
                'isBase64Encoded': False
            }
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else 'Unknown error'
        return {
            'statusCode': e.code,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': f'Ошибка запроса к Dadata: {error_body}'
            }),
            'isBase64Encoded': False
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'Внутренняя ошибка: {str(e)}'}),
            'isBase64Encoded': False
        }
