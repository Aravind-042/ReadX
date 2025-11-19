import React from 'react';
import { SparklesIcon, PaletteIcon, PencilIcon, TranslateIcon } from './icons';

interface SelectionToolbarProps {
  rect: DOMRect;
  onExplain: () => void;
  onIllustrate: () => void;
  onHighlight: () => void;
  onTranslate: () => void;
  containerRef: React.RefObject<HTMLElement>;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({ rect, onExplain, onIllustrate, onHighlight, onTranslate, containerRef }) => {
  if (!containerRef.current) return null;

  const containerRect = containerRef.current.getBoundingClientRect();
  
  const style: React.CSSProperties = {
    position: 'absolute',
    top: `${rect.top - containerRect.top + containerRef.current.scrollTop - 50}px`,
    left: `${rect.left - containerRect.left + rect.width / 2}px`,
    transform: 'translateX(-50%)',
    zIndex: 10,
  };
  
  const actionButtonClass = "flex items-center gap-1.5 px-3 py-1.5 bg-readx-dark-secondary text-white rounded-md hover:bg-readx-accent transition-all duration-200 shadow-lg text-sm";

  return (
    <div style={style} className="flex items-center space-x-2 p-1.5 bg-readx-dark rounded-lg shadow-2xl border border-gray-700">
      <button onClick={onHighlight} className={actionButtonClass}>
        <PencilIcon className="w-4 h-4" /> Highlight
      </button>
      <button onClick={onExplain} className={actionButtonClass}>
        <SparklesIcon className="w-4 h-4" /> Explain
      </button>
      <button onClick={onTranslate} className={actionButtonClass}>
        <TranslateIcon className="w-4 h-4" /> Translate
      </button>
      <button onClick={onIllustrate} className={actionButtonClass}>
        <PaletteIcon className="w-4 h-4" /> Illustrate
      </button>
    </div>
  );
};