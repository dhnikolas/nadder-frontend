import React, { useState, useEffect } from 'react';
import { CardResponse, CreateCardRequest } from '../../types/api';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card?: CardResponse | null; // undefined для создания новой карточки
  onUpdate?: (cardId: number, cardData: { title?: string; description?: string }) => Promise<void>;
  onCreateCard?: (cardData: CreateCardRequest) => Promise<void>;
  statusId?: number; // ID статуса для создания карточки
}

const CardModal: React.FC<CardModalProps> = ({
  isOpen,
  onClose,
  card,
  onUpdate,
  onCreateCard,
  statusId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
    }
  }, [card]);

  const isEditMode = !!card;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      if (isEditMode && card && onUpdate) {
        // Режим редактирования
        await onUpdate(card.id, {
          title: title.trim(),
          description: description.trim() || undefined,
        });
      } else if (!isEditMode && onCreateCard && statusId) {
        // Режим создания
        await onCreateCard({
          title: title.trim(),
          description: description.trim() || undefined,
        });
      }
      handleClose();
    } catch (error) {
      console.error('Ошибка обработки карточки:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      if (isEditMode && card) {
        setTitle(card.title);
        setDescription(card.description || '');
      } else {
        setTitle('');
        setDescription('');
      }
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleClose}>
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-32px)]">
          <div className="space-y-4">
            <div>
                          <label htmlFor="title" className="block text-base font-medium text-gray-700 mb-1">
              Название карточки *
            </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Введите название карточки"
                required
                autoFocus
              />
            </div>

            <div>
                          <label htmlFor="description" className="block text-base font-medium text-gray-700 mb-1">
              Описание карточки
            </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                placeholder="Введите подробное описание карточки (необязательно)"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors font-medium"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading || !title.trim()}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? (isEditMode ? 'Сохранение...' : 'Создание...') : (isEditMode ? 'Сохранить' : 'Создать')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CardModal;
