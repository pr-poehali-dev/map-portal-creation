import { Badge } from '@/components/ui/badge';

interface BadgePulseProps {
  children: React.ReactNode;
}

export function BadgePulse({ children }: BadgePulseProps) {
  return (
    <div className="relative inline-flex">
      {children}
      <span className="absolute top-0 right-0 flex h-3 w-3 -translate-y-1/2 translate-x-1/2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
      </span>
    </div>
  );
}
