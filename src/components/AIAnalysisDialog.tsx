import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { analyzeWithAI } from '@/services/ai';
import { PolygonObject } from '@/types/polygon';
import { toast } from 'sonner';

interface AIAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  object: PolygonObject | null;
}

export default function AIAnalysisDialog({
  open,
  onOpenChange,
  object,
}: AIAnalysisDialogProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async (customQuestion?: string) => {
    if (!object) return;

    setIsLoading(true);
    try {
      const response = await analyzeWithAI({
        objectData: {
          name: object.name,
          type: object.type,
          area: object.area,
          layer: object.layer,
          cadastralNumber: object.cadastralNumber,
          attributes: object.attributes,
        },
        coordinates: object.coordinates,
        userQuery: customQuestion || question,
        mode: 'land-analysis',
      });

      setAnalysis(response.result);
      if (customQuestion) {
        setQuestion('');
      }
    } catch (error: any) {
      toast.error(error.message || 'Ошибка AI-анализа');
      setAnalysis('❌ Произошла ошибка при анализе. Проверьте настройку OpenAI API ключа.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setAnalysis('');
      setQuestion('');
    } else if (isOpen && object && !analysis) {
      handleAnalyze();
    }
  };

  const quickQuestions = [
    'Подходит ли для жилого строительства?',
    'Какие риски есть у этого участка?',
    'Какова примерная стоимость участка?',
    'Есть ли рядом инфраструктура?',
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Sparkles" size={24} />
            AI-Анализ участка
          </DialogTitle>
          <DialogDescription>
            {object?.name} • {object?.type}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {isLoading && !analysis && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Icon name="Loader2" size={48} className="animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Анализирую участок...</p>
              </div>
            </div>
          )}

          {analysis && (
            <Card className="p-6 mb-4">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap">{analysis}</div>
              </div>
            </Card>
          )}

          {!isLoading && analysis && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Icon name="MessageCircle" size={16} />
                  Задайте дополнительный вопрос
                </h3>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {quickQuestions.map((q) => (
                    <Button
                      key={q}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAnalyze(q)}
                      disabled={isLoading}
                      className="text-xs"
                    >
                      {q}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Напишите свой вопрос..."
                    className="min-h-[80px]"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={() => handleAnalyze()}
                    disabled={!question.trim() || isLoading}
                    size="icon"
                    className="h-[80px] w-[80px]"
                  >
                    {isLoading ? (
                      <Icon name="Loader2" size={20} className="animate-spin" />
                    ) : (
                      <Icon name="Send" size={20} />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
