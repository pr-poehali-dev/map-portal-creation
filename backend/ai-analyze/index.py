import json
import os
from typing import Dict, Any
import urllib.request
import urllib.error

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: AI-анализ участков для девелопмента через OpenAI
    Args: event с httpMethod, body (objectData, userQuery, mode, coordinates)
    Returns: HTTP response с результатом AI-анализа
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'OpenAI API key not configured'})
        }
    
    request_data = json.loads(event.get('body', '{}'))
    object_data = request_data.get('objectData')
    user_query = request_data.get('userQuery')
    mode = request_data.get('mode', 'land-analysis')
    coordinates = request_data.get('coordinates')
    
    system_prompt = ''
    user_prompt = ''
    
    if mode == 'land-analysis':
        system_prompt = '''Ты — экспертный аналитик недвижимости и девелопмента в КСИ (Кадастровые Системы и Инженерные решения).
Твоя задача — проанализировать земельный участок и дать профессиональную оценку для девелопмента.

Анализируй:
- Местоположение и инфраструктуру
- Параметры участка (площадь, форма, рельеф)
- Правовой статус и ограничения
- Потенциал для строительства
- Риски и возможности
- Рекомендации по использованию

Отвечай кратко, структурировано, профессионально. Используй emoji для визуального выделения разделов.'''
        
        parts = []
        if object_data:
            parts.append(f"**Данные участка:**\n{json.dumps(object_data, ensure_ascii=False, indent=2)}")
        if coordinates:
            parts.append(f"**Координаты границ:**\n{json.dumps(coordinates, ensure_ascii=False, indent=2)}")
        if user_query:
            parts.append(f"**Вопрос пользователя:**\n{user_query}")
        
        user_prompt = f"Проанализируй земельный участок:\n\n{chr(10).join(parts)}\n\nДай профессиональный анализ для девелопмента."
    
    elif mode == 'auto-fill':
        system_prompt = '''Ты — система автозаполнения атрибутов участков в КСИ.
Анализируй данные участка и предлагай значения для пустых полей.

Заполняй:
- Категорию использования (жилое, коммерческое, промышленное и т.д.)
- Зонирование
- Примерную стоимость
- Описание локации
- Потенциал развития

Возвращай только JSON без дополнительного текста.'''
        
        user_prompt = f'''Заполни отсутствующие атрибуты для участка:

{json.dumps(object_data, ensure_ascii=False, indent=2)}

Верни JSON формата:
{{
  "category": "...",
  "zoning": "...",
  "estimatedPrice": "...",
  "locationDescription": "...",
  "developmentPotential": "..."
}}'''
    
    elif mode == 'smart-search':
        system_prompt = '''Ты — интеллектуальная система поиска участков в КСИ.
Интерпретируй естественный язык пользователя в критерии поиска.

Примеры запросов:
- "участок под жилой дом до 50 млн"
- "коммерческая земля у метро"
- "большой участок для застройки"

Возвращай только JSON без дополнительного текста.'''
        
        user_prompt = f'''Преобразуй запрос пользователя в критерии поиска:

"{user_query}"

Верни JSON формата:
{{
  "filters": {{
    "category": "...",
    "priceMax": 123,
    "areaMin": 123,
    "features": ["metro", "infrastructure"]
  }},
  "interpretation": "..."
}}'''
    
    elif mode == 'chat':
        system_prompt = '''Ты — AI-ассистент КСИ (Кадастровые Системы и Инженерные решения).
Помогаешь пользователям с вопросами о недвижимости, участках, девелопменте.

Отвечай:
- Кратко и по делу
- Профессионально, но дружелюбно
- С использованием emoji для структуры
- На основе данных, если они предоставлены

Если нужны уточнения — запрашивай их.'''
        
        user_prompt = user_query or 'Привет! Чем могу помочь?'
    
    openai_request = {
        'model': 'gpt-4o-mini',
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt}
        ],
        'temperature': 0.7,
        'max_tokens': 2000
    }
    
    req = urllib.request.Request(
        'https://api.openai.com/v1/chat/completions',
        data=json.dumps(openai_request).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        }
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            openai_data = json.loads(response.read().decode('utf-8'))
            result = openai_data['choices'][0]['message']['content']
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({
                    'result': result,
                    'mode': mode,
                    'requestId': context.request_id
                }, ensure_ascii=False)
            }
    
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        return {
            'statusCode': e.code,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'OpenAI API error',
                'details': error_body
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'details': str(e)
            })
        }
