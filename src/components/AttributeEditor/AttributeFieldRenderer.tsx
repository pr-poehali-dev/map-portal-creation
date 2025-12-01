import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Autocomplete } from '@/components/ui/autocomplete';
import OwnerFieldWithInn from './OwnerFieldWithInn';
import SegmentSelector from './SegmentSelector';

interface AttributeTemplate {
  id: number;
  name: string;
  field_type: string;
  is_required: boolean;
  default_value?: string;
  options?: string;
  sort_order: number;
}

interface AttributeFieldRendererProps {
  template: AttributeTemplate;
  value: any;
  onChange: (value: any) => void;
  beneficiaries?: string[];
}

export default function AttributeFieldRenderer({ 
  template, 
  value, 
  onChange, 
  beneficiaries = [] 
}: AttributeFieldRendererProps) {
  switch (template.field_type) {
    case 'text':
      if (template.name.toLowerCase() === 'бенефициар') {
        return (
          <Autocomplete
            value={value}
            onChange={onChange}
            suggestions={beneficiaries}
            placeholder={template.default_value || `Введите ${template.name.toLowerCase()}`}
          />
        );
      }
      
      if (template.name.toLowerCase() === 'правообладатель') {
        return (
          <OwnerFieldWithInn
            value={value}
            onChange={onChange}
            placeholder={template.default_value || `Введите ${template.name.toLowerCase()}`}
          />
        );
      }

      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={template.default_value || `Введите ${template.name.toLowerCase()}`}
        />
      );

    case 'textarea':
      return (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={template.default_value || `Введите ${template.name.toLowerCase()}`}
          rows={3}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : '')}
          placeholder={template.default_value || '0'}
        />
      );

    case 'select':
      const options = template.options ? template.options.split(',').map(o => o.trim()) : [];
      
      if (template.name.toLowerCase() === 'сегмент') {
        return (
          <SegmentSelector
            value={value}
            options={options}
            onChange={onChange}
          />
        );
      }
      
      return (
        <Select
          value={value}
          onValueChange={onChange}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Выберите ${template.name.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'date':
      return (
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'checkbox':
      return (
        <div className="flex items-center space-x-2">
          <Switch
            checked={value === 'true' || value === true}
            onCheckedChange={onChange}
          />
          <span className="text-sm text-muted-foreground">
            {value === 'true' || value === true ? 'Да' : 'Нет'}
          </span>
        </div>
      );

    default:
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Введите ${template.name.toLowerCase()}`}
        />
      );
  }
}
