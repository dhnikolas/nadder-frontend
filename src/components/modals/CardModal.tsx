import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { CardResponse, CreateCardRequest, StatusResponse, MoveCardRequest } from '../../types/api';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card?: CardResponse | null; // undefined для создания новой карточки
  onUpdate?: (cardId: number, cardData: { title?: string; description?: string }) => Promise<void>;
  onCreateCard?: (cardData: CreateCardRequest) => Promise<void>;
  onMoveCard?: (cardId: number, data: MoveCardRequest) => Promise<void>;
  statusId?: number; // ID статуса для создания карточки
  statuses?: StatusResponse[]; // Список всех статусов для перемещения
}

const CardModal: React.FC<CardModalProps> = ({
  isOpen,
  onClose,
  card,
  onUpdate,
  onCreateCard,
  onMoveCard,
  statusId,
  statuses = [],
}) => {
  // Инициализируем контент сразу при получении карточки
  const getInitialContent = () => {
    if (card) {
      return card.title + (card.description ? '\n' + card.description : '');
    }
    return '';
  };

  const [content, setContent] = useState(getInitialContent);
  const [isLoading, setIsLoading] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [isMouseDownInside, setIsMouseDownInside] = useState(false);
  const [initialContent, setInitialContent] = useState(getInitialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Функция для разделения контента на название и описание
  const parseContent = (text: string) => {
    const lines = text.split('\n');
    const title = lines[0] || '';
    const description = lines.slice(1).join('\n');
    return { title, description };
  };

  // Функция для проверки изменений
  const hasChanges = () => {
    return content.trim() !== initialContent.trim();
  };

  // Обновляем контент при изменении карточки
  useLayoutEffect(() => {
    if (isOpen) {
      if (card) {
        const combinedContent = card.title + (card.description ? '\n' + card.description : '');
        setContent(combinedContent);
        setInitialContent(combinedContent);
      } else {
        setContent('');
        setInitialContent('');
      }
    }
  }, [card, isOpen]);

  // Устанавливаем курсор в конец текста только один раз при открытии
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      const textarea = textareaRef.current;
      const textLength = textarea.value.length;
      textarea.setSelectionRange(textLength, textLength);
      textarea.focus();
    }
  }, [isOpen]); // Только при изменении isOpen, не при изменении content

  const isEditMode = !!card;

  // Функции для перемещения карточки
  const handleMoveClick = () => {
    if (card) {
      setSelectedStatusId(card.status_id);
      setIsMoveModalOpen(true);
    }
  };

  const handleMoveConfirm = async () => {
    if (!card || !selectedStatusId || !onMoveCard || selectedStatusId === card.status_id) {
      setIsMoveModalOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      await onMoveCard(card.id, { status_id: selectedStatusId });
      setIsMoveModalOpen(false);
      onClose(); // Закрываем модальное окно после перемещения
    } catch (error) {
      console.error('Ошибка перемещения карточки:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveCancel = () => {
    setIsMoveModalOpen(false);
    setSelectedStatusId(null);
  };

  // Обработчики для отслеживания кликов
  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    // Проверяем, что клик был именно по backdrop, а не по модальному окну
    if (e.target === e.currentTarget) {
      setIsMouseDownInside(false);
    }
  };

  const handleBackdropClick = async (e: React.MouseEvent) => {
    // Закрываем только если клик начался и закончился вне модального окна
    if (e.target === e.currentTarget && !isMouseDownInside) {
      await handleSaveAndClose();
    }
  };

  const handleModalMouseDown = () => {
    setIsMouseDownInside(true);
  };

  // Функция 1: Закрывает и сохраняет карточку если есть изменения
  const handleSaveAndClose = async () => {
    if (isLoading) return;

    // Проверяем, есть ли изменения
    if (!hasChanges()) {
      onClose();
      return;
    }

    const { title, description } = parseContent(content);

    setIsLoading(true);
    try {
      if (isEditMode && card && onUpdate) {
        // Режим редактирования - сохраняем даже пустую карточку
        await onUpdate(card.id, {
          title: title.trim() || 'Без названия',
          description: description.trim(),
        });
      } else if (!isEditMode && onCreateCard && statusId) {
        // Режим создания - сохраняем даже пустую карточку
        await onCreateCard({
          title: title.trim() || 'Без названия',
          description: description.trim(),
        });
      }
      onClose();
    } catch (error) {
      console.error('Ошибка сохранения карточки:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Функция 2: Закрывает и не сохраняет карточку
  const handleCloseWithoutSave = () => {
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSaveAndClose();
  };


  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
          .first-line-bold::first-line {
            font-weight: bold;
          }
        `}
      </style>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
        onMouseDown={handleBackdropMouseDown}
        onClick={handleBackdropClick}
      >
        <div 
          className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 h-[80vh] overflow-hidden" 
          onMouseDown={handleModalMouseDown}
          onClick={(e) => e.stopPropagation()}
        >

        <form onSubmit={handleSubmit} className="p-4 h-full flex flex-col">
          <div className="flex-1">
              <textarea
                ref={textareaRef}
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-0 focus:border-gray-300 resize-none first-line-bold"
                placeholder="Введите название карточки (первая строка)&#10;И описание карточки (остальные строки)"
                required
                autoFocus
                style={{
                  fontFamily: 'monospace',
                  lineHeight: '1.5',
                  fontWeight: 'normal'
                }}
              />
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleCloseWithoutSave}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors font-medium"
            >
              Отмена
            </button>
              
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isLoading ? (isEditMode ? 'Сохранение...' : 'Создание...') : (isEditMode ? 'Сохранить' : 'Создать')}
              </button>
            </div>
            
            {/* Кнопка перемещения (только в режиме редактирования) */}
            {isEditMode && card && onMoveCard && statuses.length > 1 && (
              <button
                type="button"
                onClick={handleMoveClick}
                disabled={isLoading}
                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors font-medium border border-blue-200 hover:border-blue-300"
              >
                Переместить
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Модальное окно выбора статуса для перемещения */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60" onClick={handleMoveCancel}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Переместить карточку</h3>
              
              <div className="mb-6">
                <label htmlFor="status-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Выберите статус
                </label>
                <select
                  id="status-select"
                  value={selectedStatusId || ''}
                  onChange={(e) => setSelectedStatusId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleMoveCancel}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors font-medium"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleMoveConfirm}
                  disabled={isLoading || !selectedStatusId || selectedStatusId === card?.status_id}
                  className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isLoading ? 'Перемещение...' : 'Переместить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default CardModal;

