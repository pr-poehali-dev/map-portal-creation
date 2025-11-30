import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

export default function AIFeaturesTour() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('ai-tour-seen');
    if (!hasSeenTour) {
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const steps = [
    {
      icon: 'Bot',
      title: '🤖 Встречайте AI-Ассистента!',
      description: 'Теперь у вас есть личный помощник по недвижимости. Откройте вкладку "AI" в боковой панели для консультаций.',
      position: 'left',
    },
    {
      icon: 'Sparkles',
      title: '✨ AI-Анализ участков',
      description: 'Нажмите "AI Анализ" в карточке участка для получения профессиональной оценки и рекомендаций по девелопменту.',
      position: 'right',
    },
    {
      icon: 'Wand2',
      title: '🎯 Автозаполнение атрибутов',
      description: 'При редактировании участка используйте "AI Заполнение" — система предложит значения для всех полей автоматически.',
      position: 'right',
    },
    {
      icon: 'Search',
      title: '🔍 Умный поиск',
      description: 'Наведите на строку поиска и нажмите иконку ✨ для интеллектуального поиска на естественном языке.',
      position: 'left',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('ai-tour-seen', 'true');
  };

  if (!isVisible) return null;

  const step = steps[currentStep];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
      <div className={`fixed z-50 ${
        step.position === 'left' ? 'left-[420px]' : 'right-8'
      } top-1/2 -translate-y-1/2 animate-in slide-in-from-bottom-4`}>
        <Card className="w-[400px] p-6 shadow-2xl border-2 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon name={step.icon as any} size={24} className="text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
              
              <div className="flex items-center gap-3">
                <div className="flex gap-1 flex-1">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        index === currentStep
                          ? 'bg-primary'
                          : index < currentStep
                          ? 'bg-primary/50'
                          : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                
                <div className="flex gap-2">
                  {currentStep < steps.length - 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSkip}
                    >
                      Пропустить
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleNext}
                  >
                    {currentStep < steps.length - 1 ? 'Далее' : 'Начать!'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
