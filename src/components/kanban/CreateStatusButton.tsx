import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface CreateStatusButtonProps {
  onCreateStatus: (name: string) => Promise<void>;
  isLoading?: boolean;
}

const CreateStatusButton: React.FC<CreateStatusButtonProps> = ({ 
  onCreateStatus, 
  isLoading = false 
}) => {
  const [statusName, setStatusName] = useState('');
  const [isInputVisible, setIsInputVisible] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusName.trim()) return;

    try {
      await onCreateStatus(statusName.trim());
      setStatusName('');
      setIsInputVisible(false);
    } catch (error) {
      console.error('Ошибка создания статуса:', error);
    }
  };

  const handleCancel = () => {
    setStatusName('');
    setIsInputVisible(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isInputVisible) {
    return (
      <div className="w-64 bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="statusName" className="block text-sm font-medium text-gray-700 mb-1">
              Название статуса
            </label>
            <input
              id="statusName"
              type="text"
              value={statusName}
              onChange={(e) => setStatusName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Введите название статуса"
              autoFocus
              disabled={isLoading}
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={!statusName.trim() || isLoading}
              className="flex-1 px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Создание...' : 'Создать'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="px-3 py-2 text-gray-600 text-sm font-medium rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-80">
      <div className="flex items-center justify-start p-2 mb-2">
        <button
          onClick={() => setIsInputVisible(true)}
          disabled={isLoading}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Добавить статус"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CreateStatusButton;
