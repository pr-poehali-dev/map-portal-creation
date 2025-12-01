import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/contexts/AuthContext';

interface Segment {
  id: number;
  name: string;
  color: string;
  order_index: number;
}

interface SegmentSelectorProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

const SEGMENTS_API = 'https://functions.poehali.dev/a0768bda-66ad-4c1e-b0f8-a32596d094b8';

export default function SegmentSelector({ value, options, onChange }: SegmentSelectorProps) {
  const { user } = useAuth();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    try {
      const response = await fetch(SEGMENTS_API, {
        headers: { 'X-User-Id': user?.token || '' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSegments(data);
      }
    } catch (error) {
      console.error('Failed to load segments', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSegments = Array.isArray(value) 
    ? value 
    : (value ? value.split(',').map((s: string) => s.trim()) : []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Icon name="Loader2" className="animate-spin" size={20} />
      </div>
    );
  }

  const segmentsToShow = segments.length > 0 ? segments : options.map((name, idx) => ({
    id: idx,
    name,
    color: '#3B82F6',
    order_index: idx
  }));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {segmentsToShow.map(segment => {
          const isSelected = selectedSegments.includes(segment.name);
          return (
            <button
              key={segment.name}
              type="button"
              onClick={() => {
                let newSegments;
                if (isSelected) {
                  newSegments = selectedSegments.filter((s: string) => s !== segment.name);
                } else {
                  newSegments = [...selectedSegments, segment.name];
                }
                onChange(newSegments.join(', '));
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                isSelected 
                  ? 'ring-2 ring-offset-2 ring-offset-background shadow-sm' 
                  : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: isSelected ? segment.color : 'transparent',
                color: isSelected ? '#fff' : segment.color,
                borderColor: segment.color,
                borderWidth: '2px',
                borderStyle: 'solid',
                ringColor: segment.color
              }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              {segment.name}
              {isSelected && (
                <Icon name="Check" size={14} />
              )}
            </button>
          );
        })}
      </div>
      {selectedSegments.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Выбрано: {selectedSegments.join(', ')}
        </p>
      )}
    </div>
  );
}
