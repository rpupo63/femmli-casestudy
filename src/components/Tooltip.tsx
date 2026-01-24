import { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';

interface TooltipProps {
  content: string;
  title?: string;
}

export function Tooltip({ content, title }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-flex" ref={tooltipRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-full hover:bg-sand-200 transition-colors"
        aria-label="Show information"
        aria-expanded={isOpen}
      >
        <Info className="w-4 h-4 text-sand-400" />
      </button>

      {isOpen && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 sm:w-64 p-3 sm:p-4 glass rounded-xl shadow-lg border border-sand-200 z-[100]"
          role="tooltip"
        >
          <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
            {title && <div className="text-xs sm:text-sm font-medium text-sand-900">{title}</div>}
            <button
              onClick={() => setIsOpen(false)}
              className="p-0.5 rounded hover:bg-sand-200 transition-colors flex-shrink-0"
            >
              <X className="w-3 h-3 text-sand-500" />
            </button>
          </div>
          <p className="text-[11px] sm:text-xs text-sand-700 leading-relaxed">{content}</p>
        </div>
      )}
    </div>
  );
}
