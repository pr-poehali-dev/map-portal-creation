const AI_API_URL = 'https://functions.poehali.dev/fb635c08-436f-495d-a458-9ab6c796086a';

export interface AIAnalyzeRequest {
  objectData?: any;
  coordinates?: number[][];
  userQuery?: string;
  mode: 'land-analysis' | 'auto-fill' | 'smart-search' | 'chat';
}

export interface AIAnalyzeResponse {
  result: string;
  mode: string;
  requestId: string;
}

export async function analyzeWithAI(request: AIAnalyzeRequest): Promise<AIAnalyzeResponse> {
  const response = await fetch(AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'AI analysis failed');
  }

  return response.json();
}
