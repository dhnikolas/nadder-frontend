import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CreatePipelineRequest } from '../../types/api';

interface CreatePipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePipeline: (pipelineData: CreatePipelineRequest) => Promise<void>;
  isLoading: boolean;
}

const CreatePipelineModal: React.FC<CreatePipelineModalProps> = ({
  isOpen,
  onClose,
  onCreatePipeline,
  isLoading,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');

  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onCreatePipeline({ name: name.trim(), color });
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Создать pipeline</h3>
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
            <label htmlFor="pipelineName" className="block text-sm font-medium text-gray-700 mb-2">
              Название pipeline
            </label>
            <input
              id="pipelineName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название pipeline"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Цвет pipeline
            </label>
            <div className="flex space-x-2">
              {colorOptions.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  onClick={() => setColor(colorOption)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    color === colorOption ? 'border-gray-400' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: colorOption }}
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

export default CreatePipelineModal;
