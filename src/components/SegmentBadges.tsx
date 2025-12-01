import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

interface Segment {
  id: number;
  name: string;
  color: string;
}

interface SegmentBadgesProps {
  segments: string;
}

const SEGMENTS_API = 'https://functions.poehali.dev/a0768bda-66ad-4c1e-b0f8-a32596d094b8';

export default function SegmentBadges({ segments }: SegmentBadgesProps) {
  const { user } = useAuth();
  const [segmentColors, setSegmentColors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    try {
      const response = await fetch(SEGMENTS_API, {
        headers: { 'X-User-Id': user?.token || '' }
      });
      
      if (response.ok) {
        const data: Segment[] = await response.json();
        const colors: Record<string, string> = {};
        data.forEach(seg => {
          colors[seg.name] = seg.color;
        });
        setSegmentColors(colors);
      }
    } catch (error) {
      console.error('Failed to load segments', error);
    }
  };

  const segmentList = segments ? segments.split(',').map(s => s.trim()).filter(Boolean) : [];

  if (segmentList.length === 0) {
    return <span className="text-sm font-medium text-muted-foreground">Не указан</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {segmentList.map((segmentName) => {
        const color = segmentColors[segmentName] || '#3B82F6';
        return (
          <Badge 
            key={segmentName}
            style={{
              backgroundColor: color,
              color: '#fff',
              borderColor: color
            }}
            className="px-2 py-1 text-xs font-medium"
          >
            {segmentName}
          </Badge>
        );
      })}
    </div>
  );
}
