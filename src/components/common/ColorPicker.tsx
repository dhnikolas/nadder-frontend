import React, { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onColorChange, isOpen, onToggle }) => {
  const ref = useRef<HTMLDivElement>(null);

  // Закрываем ColorPicker при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  const colors = [
    '#3B82F6', // blue-500
    '#EF4444', // red-500
    '#10B981', // emerald-500
    '#F59E0B', // amber-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#06B6D4', // cyan-500
    '#84CC16', // lime-500
    '#F97316', // orange-500
    '#6366F1', // indigo-500
    '#14B8A6', // teal-500
    '#F43F5E', // rose-500
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors duration-200 flex items-center justify-center"
        style={{ backgroundColor: selectedColor }}
        title="Изменить цвет"
      >
        {isOpen && <Check className="w-3 h-3 text-white" />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-white border border-gray-300 rounded-lg shadow-lg z-20 min-w-[200px]">
          <div className="grid grid-cols-4 gap-2">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => {
                  onColorChange(color);
                  onToggle();
                }}
                className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                  selectedColor === color 
                    ? 'border-gray-800 scale-110' 
                    : 'border-gray-300 hover:border-gray-500'
                }`}
                style={{ backgroundColor: color }}
                title={`Выбрать цвет: ${color}`}
              >
                {selectedColor === color && (
                  <Check className="w-4 h-4 text-white mx-auto" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
