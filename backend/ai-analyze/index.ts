/**
 * Business: AI-анализ участков для девелопмента через OpenAI
 * Args: event с httpMethod, body (objectData, userQuery, mode, coordinates)
 * Returns: HTTP response с результатом AI-анализа
 */

interface CloudFunctionEvent {
    httpMethod: string;
    headers: Record<string, string>;
    queryStringParameters?: Record<string, string>;
    body?: string;
    isBase64Encoded: boolean;
}

interface CloudFunctionContext {
    requestId: string;
    functionName: string;
    functionVersion: string;
    memoryLimitInMB: number;
}

interface AnalyzeRequest {
    objectData?: any;
    coordinates?: number[][];
    userQuery?: string;
    mode: 'land-analysis' | 'auto-fill' | 'smart-search' | 'chat';
}

export const handler = async (event: CloudFunctionEvent, context: CloudFunctionContext): Promise<any> => {
    const { httpMethod, body } = event;

    if (httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            body: ''
        };
    }

    if (httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'OpenAI API key not configured' })
        };
    }

    const request: AnalyzeRequest = JSON.parse(body || '{}');
    const { objectData, userQuery, mode, coordinates } = request;

    let systemPrompt = '';
    let userPrompt = '';

    if (mode === 'land-analysis') {
        systemPrompt = `Ты — экспертный аналитик недвижимости и девелопмента в КСИ (Кадастровые Системы и Инженерные решения).
Твоя задача — проанализировать земельный участок и дать профессиональную оценку для девелопмента.

Анализируй:
- Местоположение и инфраструктуру
- Параметры участка (площадь, форма, рельеф)
- Правовой статус и ограничения
- Потенциал для строительства
- Риски и возможности
- Рекомендации по использованию

Отвечай кратко, структурировано, профессионально. Используй emoji для визуального выделения разделов.`;

        userPrompt = `Проанализируй земельный участок:

${objectData ? `**Данные участка:**
${JSON.stringify(objectData, null, 2)}` : ''}

${coordinates ? `**Координаты границ:**
${JSON.stringify(coordinates, null, 2)}` : ''}

${userQuery ? `**Вопрос пользователя:**
${userQuery}` : ''}

Дай профессиональный анализ для девелопмента.`;
    } else if (mode === 'auto-fill') {
        systemPrompt = `Ты — система автозаполнения атрибутов участков в КСИ.
Анализируй данные участка и предлагай значения для пустых полей.

Заполняй:
- Категорию использования (жилое, коммерческое, промышленное и т.д.)
- Зонирование
- Примерную стоимость
- Описание локации
- Потенциал развития

Возвращай только JSON без дополнительного текста.`;

        userPrompt = `Заполни отсутствующие атрибуты для участка:

${JSON.stringify(objectData, null, 2)}

Верни JSON формата:
{
  "category": "...",
  "zoning": "...",
  "estimatedPrice": "...",
  "locationDescription": "...",
  "developmentPotential": "..."
}`;
    } else if (mode === 'smart-search') {
        systemPrompt = `Ты — интеллектуальная система поиска участков в КСИ.
Интерпретируй естественный язык пользователя в критерии поиска.

Примеры запросов:
- "участок под жилой дом до 50 млн"
- "коммерческая земля у метро"
- "большой участок для застройки"

Возвращай только JSON без дополнительного текста.`;

        userPrompt = `Преобразуй запрос пользователя в критерии поиска:

"${userQuery}"

Верни JSON формата:
{
  "filters": {
    "category": "...",
    "priceMax": 123,
    "areaMin": 123,
    "features": ["metro", "infrastructure"]
  },
  "interpretation": "..."
}`;
    } else if (mode === 'chat') {
        systemPrompt = `Ты — AI-ассистент КСИ (Кадастровые Системы и Инженерные решения).
Помогаешь пользователям с вопросами о недвижимости, участках, девелопменте.

Отвечай:
- Кратко и по делу
- Профессионально, но дружелюбно
- С использованием emoji для структуры
- На основе данных, если они предоставлены

Если нужны уточнения — запрашивай их.`;

        userPrompt = userQuery || 'Привет! Чем могу помочь?';
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2000
        })
    });

    if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        return {
            statusCode: openaiResponse.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'OpenAI API error',
                details: errorText 
            })
        };
    }

    const openaiData = await openaiResponse.json();
    const result = openaiData.choices[0].message.content;

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        isBase64Encoded: false,
        body: JSON.stringify({ 
            result,
            mode,
            requestId: context.requestId
        })
    };
};
