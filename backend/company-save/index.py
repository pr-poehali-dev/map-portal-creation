import json
import os
from typing import Dict, Any
import urllib.request
import urllib.error
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import uuid

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Поиск компании по ИНН и автоматическое сохранение в базу
    Args: event с httpMethod, queryStringParameters (inn)
    Returns: HTTP ответ с данными сохраненной компании
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
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
    
    # Проверяем формат ИНН
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
    
    # Подключение к базе данных
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'DATABASE_URL не настроен'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Проверяем, есть ли компания с таким ИНН в базе
        cursor.execute(
            "SELECT * FROM t_p43707323_map_portal_creation.companies WHERE inn = %s",
            (inn,)
        )
        existing_company = cursor.fetchone()
        
        if existing_company:
            # Компания уже есть в базе, возвращаем её
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(dict(existing_company), default=str, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        # Получаем API ключ Dadata
        dadata_key = os.environ.get('DADATA_API_KEY')
        if not dadata_key:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'DADATA_API_KEY не настроен'}),
                'isBase64Encoded': False
            }
        
        # Запрашиваем данные из Dadata
        url = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party'
        request_data = json.dumps({'query': inn}).encode('utf-8')
        
        req = urllib.request.Request(
            url,
            data=request_data,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Token {dadata_key}'
            }
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            response_data = json.loads(response.read().decode('utf-8'))
            
            if not response_data.get('suggestions'):
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Компания не найдена в ЕГРЮЛ'}),
                    'isBase64Encoded': False
                }
            
            # Извлекаем данные
            suggestion = response_data['suggestions'][0]
            data = suggestion.get('data', {})
            
            # Создаем новую компанию в базе
            company_id = str(uuid.uuid4())
            now = datetime.utcnow()
            
            registration_date = None
            if data.get('state', {}).get('registration_date'):
                reg_timestamp = data['state']['registration_date']
                if reg_timestamp:
                    registration_date = datetime.fromtimestamp(reg_timestamp / 1000).date()
            
            cursor.execute("""
                INSERT INTO t_p43707323_map_portal_creation.companies 
                (id, name, short_name, inn, kpp, ogrn, address, phone, email, website, 
                 description, status, company_type, registration_date, okved, 
                 management_name, management_post, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                company_id,
                data.get('name', {}).get('full_with_opf', ''),
                data.get('name', {}).get('short_with_opf', ''),
                data.get('inn', ''),
                data.get('kpp', ''),
                data.get('ogrn', ''),
                data.get('address', {}).get('unrestricted_value', ''),
                '',  # phone
                '',  # email
                '',  # website
                f"Автоматически добавлено из ЕГРЮЛ по ИНН {inn}",
                data.get('state', {}).get('status', 'ACTIVE'),
                data.get('type', ''),
                registration_date,
                data.get('okved', ''),
                data.get('management', {}).get('name', ''),
                data.get('management', {}).get('post', ''),
                now,
                now
            ))
            
            conn.commit()
            new_company = cursor.fetchone()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(dict(new_company), default=str, ensure_ascii=False),
                'isBase64Encoded': False
            }
            
    except urllib.error.HTTPError as e:
        conn.rollback()
        return {
            'statusCode': e.code,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'Ошибка Dadata API: {e.code}'}),
            'isBase64Encoded': False
        }
    except Exception as e:
        conn.rollback()
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'Ошибка: {str(e)}'}),
            'isBase64Encoded': False
        }
    finally:
        cursor.close()
        conn.close()
