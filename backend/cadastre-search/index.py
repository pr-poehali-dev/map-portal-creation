import json
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Информация о загрузке геометрии земельного участка по кадастровому номеру
    Args: event с queryStringParameters (cadastral_number)
    Returns: Инструкция для пользователя как получить данные через Telegram бот
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
    
    # API Росреестра блокирует автоматические запросы
    # Предлагаем пользователю надёжный способ через Telegram бот
    result = {
        'error': 'not_available',
        'message': f'Автоматическая загрузка участка {cadastral_number} временно недоступна',
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
