import * as React from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

export function Autocomplete({
  value,
  onChange,
  suggestions,
  placeholder,
  className
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = React.useState<string[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (value) {
      const filtered = suggestions
        .filter(s => s.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 10);
      setFilteredSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setIsOpen(false);
    }
  }, [value, suggestions]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => {
          if (filteredSuggestions.length > 0) {
            setIsOpen(true);
          }
        }}
      />
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
          <ScrollArea className="max-h-[200px]">
            <div className="p-1">
              {filteredSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded-sm flex items-center justify-between gap-2"
                  onClick={() => handleSelect(suggestion)}
                >
                  <span className="truncate">{suggestion}</span>
                  <Icon name="Check" size={14} className="text-muted-foreground flex-shrink-0" />
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
