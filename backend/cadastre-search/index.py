import json
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Информация о загрузке геометрии земельного участка по кадастровому номеру
    Args: event с queryStringParameters (cadastral_number)
    Returns: Инструкция для пользователя как получить данные
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
    
    # К сожалению, все публичные API Росреестра нестабильны или заблокированы
    # Возвращаем информативное сообщение пользователю
    result = {
        'error': 'not_available',
        'message': f'API Росреестра временно недоступен для автоматической загрузки участка {cadastral_number}',
        'instructions': {
            'title': 'Как загрузить участок вручную:',
            'steps': [
                '1. Используйте Telegram бот @pkk2kml_bot',
                f'2. Отправьте боту кадастровый номер: {cadastral_number}',
                '3. Бот вернёт файл в формате KML',
                '4. Импортируйте полученный файл через кнопку "Импорт данных" в приложении'
            ],
            'alternative': 'Или скачайте KML файл с https://pkk.rosreestr.ru и импортируйте его'
        },
        'cadastral_number': cadastral_number,
        'telegram_bot': '@pkk2kml_bot',
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
