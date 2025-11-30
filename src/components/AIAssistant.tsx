import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { analyzeWithAI } from '@/services/ai';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '👋 Привет! Я AI-ассистент КСИ. Могу помочь с анализом участков, поиском и консультацией по девелопменту. Чем могу помочь?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await analyzeWithAI({
        userQuery: input,
        mode: 'chat',
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.result,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      toast.error(error.message || 'Ошибка AI-анализа');
      const errorMessage: Message = {
        role: 'assistant',
        content: '❌ Извините, произошла ошибка. Попробуйте еще раз.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Icon name="Bot" size={24} />
          AI-Ассистент
        </h2>
        <p className="text-sm text-muted-foreground">
          Анализ участков и консультации
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <Card
              key={index}
              className={`p-3 ${
                message.role === 'user'
                  ? 'ml-8 bg-primary text-primary-foreground'
                  : 'mr-8 bg-muted'
              }`}
            >
              <div className="flex items-start gap-2">
                {message.role === 'assistant' && (
                  <Icon name="Bot" size={18} className="mt-0.5 flex-shrink-0" />
                )}
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                {message.role === 'user' && (
                  <Icon name="User" size={18} className="mt-0.5 flex-shrink-0" />
                )}
              </div>
            </Card>
          ))}
          {isLoading && (
            <Card className="mr-8 bg-muted p-3">
              <div className="flex items-center gap-2">
                <Icon name="Loader2" size={18} className="animate-spin" />
                <span className="text-sm text-muted-foreground">Думаю...</span>
              </div>
            </Card>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Задайте вопрос..."
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            <Icon name="Send" size={20} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Enter — отправить, Shift+Enter — новая строка
        </p>
      </div>
    </div>
  );
}
