import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onColorChange, isOpen, onToggle }) => {
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Обновляем позицию меню при открытии и изменении размера/прокрутке
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updatePosition = () => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          setMenuPosition({
            top: rect.bottom + window.scrollY + 8,
            left: rect.left + window.scrollX,
          });
        }
      };

      updatePosition();
      
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  // Закрываем ColorPicker при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node) && 
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
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
    // Базовые цвета
    '#EF4444', // красный (red-500)
    '#F97316', // оранжевый (orange-500)
    '#F59E0B', // янтарный (amber-500)
    '#84CC16', // лайм (lime-500)
    '#10B981', // изумрудный (emerald-500)
    '#06B6D4', // циан (cyan-500)
    '#3B82F6', // синий (blue-500)
    '#6366F1', // индиго (indigo-500)
    '#8B5CF6', // фиолетовый (violet-500)
    '#EC4899', // розовый (pink-500)
    '#F43F5E', // розовый (rose-500)
    '#14B8A6', // бирюзовый (teal-500)
    // Серые оттенки
    '#6B7280', // серый (gray-500)
    '#374151', // темно-серый (gray-700)
    '#9CA3AF', // светло-серый (gray-400)
    // Дополнительные базовые цвета
    '#DC2626', // темно-красный (red-600)
    '#059669', // темно-зеленый (emerald-600)
    '#2563EB', // темно-синий (blue-600)
    '#7C3AED', // темно-фиолетовый (violet-600)
    '#1F2937', // почти черный (gray-800)
  ];

  const menuContent = isOpen && (
    <div 
      ref={ref}
      className="fixed p-3 bg-white border border-gray-300 rounded-lg shadow-lg z-[9999] min-w-[200px]"
      style={{
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
      }}
    >
      <div className="grid grid-cols-5 gap-2">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => {
              onColorChange(color);
              onToggle();
            }}
            className={`w-8 h-8 rounded-full transition-all duration-200 hover:scale-110 ${
              selectedColor === color 
                ? 'scale-110' 
                : ''
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
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={onToggle}
        className="w-4 h-4 rounded-full transition-colors duration-200 flex items-center justify-center relative"
        style={{ backgroundColor: selectedColor }}
        title="Изменить цвет"
      >
        {isOpen && <Check className="w-2 h-2 text-white" />}
      </button>

      {isOpen && typeof window !== 'undefined' && createPortal(menuContent, document.body)}
    </>
  );
};

export default ColorPicker;
