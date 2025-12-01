import Icon from '@/components/ui/icon';

interface SegmentSelectorProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export default function SegmentSelector({ value, options, onChange }: SegmentSelectorProps) {
  const selectedSegments = Array.isArray(value) 
    ? value 
    : (value ? value.split(',').map((s: string) => s.trim()) : []);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map(option => {
          const isSelected = selectedSegments.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                let newSegments;
                if (isSelected) {
                  newSegments = selectedSegments.filter((s: string) => s !== option);
                } else {
                  newSegments = [...selectedSegments, option];
                }
                onChange(newSegments.join(', '));
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isSelected 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {option}
              {isSelected && (
                <Icon name="Check" size={14} className="ml-1 inline" />
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
