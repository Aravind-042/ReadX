
import React, { useState } from 'react';
import { IllustrationStyle } from '../types';
import { CloseIcon } from './icons';

interface IllustrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (style: IllustrationStyle) => void;
  selectedText: string;
}

const styles: IllustrationStyle[] = ['Watercolor', 'Anime', 'Realistic', 'Cartoon', 'Technical Sketch'];

export const IllustrationModal: React.FC<IllustrationModalProps> = ({ isOpen, onClose, onGenerate, selectedText }) => {
  const [selectedStyle, setSelectedStyle] = useState<IllustrationStyle>('Watercolor');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-readx-dark-secondary rounded-lg shadow-xl w-full max-w-2xl transform transition-all">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold">Create Illustration</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">Selected Text</label>
            <p className="bg-readx-dark p-3 rounded-md text-sm text-gray-300 max-h-24 overflow-y-auto">
              "{selectedText}"
            </p>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">Choose a Style</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {styles.map(style => (
                <button
                  key={style}
                  onClick={() => setSelectedStyle(style)}
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${
                    selectedStyle === style ? 'bg-readx-accent text-white' : 'bg-readx-dark hover:bg-gray-700'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end p-4 bg-readx-dark rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 mr-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700">
            Cancel
          </button>
          <button onClick={() => onGenerate(selectedStyle)} className="px-4 py-2 text-sm font-medium text-white bg-readx-accent rounded-md hover:bg-blue-600">
            Generate
          </button>
        </div>
      </div>
    </div>
  );
};
