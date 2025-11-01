import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CreateStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateStatus: (statusData: { name: string; color: string }) => Promise<void>;
  isLoading: boolean;
}

const CreateStatusModal: React.FC<CreateStatusModalProps> = ({
  isOpen,
  onClose,
  onCreateStatus,
  isLoading,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');

  const colorOptions = [
    // Базовые цвета
    '#EF4444', // красный
    '#F97316', // оранжевый
    '#F59E0B', // янтарный
    '#84CC16', // лайм
    '#10B981', // изумрудный
    '#06B6D4', // циан
    '#3B82F6', // синий
    '#6366F1', // индиго
    '#8B5CF6', // фиолетовый
    '#EC4899', // розовый
    '#F43F5E', // розовый
    '#14B8A6', // бирюзовый
    // Серые оттенки
    '#6B7280', // серый
    '#374151', // темно-серый
    '#9CA3AF', // светло-серый
    // Дополнительные базовые цвета
    '#DC2626', // темно-красный
    '#059669', // темно-зеленый
    '#2563EB', // темно-синий
    '#7C3AED', // темно-фиолетовый
    '#1F2937', // почти черный
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onCreateStatus({ name: name.trim(), color });
    setName('');
    setColor('#3B82F6');
  };

  const handleClose = () => {
    if (!isLoading) {
      setName('');
      setColor('#3B82F6');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Создать статус</h3>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="statusName" className="block text-sm font-medium text-gray-700 mb-2">
              Название статуса
            </label>
            <input
              id="statusName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название статуса"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Цвет статуса
            </label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  onClick={() => setColor(colorOption)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === colorOption ? 'border-gray-600 scale-110' : 'border-transparent hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: colorOption }}
                  title={`Выбрать цвет: ${colorOption}`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateStatusModal;
