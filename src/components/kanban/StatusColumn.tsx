import React, { useState, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { StatusResponse, CardResponse, CreateCardRequest } from '../../types/api';
import { Plus } from 'lucide-react';
import Card from './Card';
import CardModal from '../modals/CardModal';
import ColorPicker from '../common/ColorPicker';

interface StatusColumnProps {
  status: StatusResponse;
  cards: CardResponse[];
  index: number;
  onCreateCard: (statusId: number, cardData: CreateCardRequest, position?: 'top' | 'bottom') => Promise<void>;
  onUpdateCard: (cardId: number, cardData: { title?: string; description?: string }) => Promise<void>;
  onDeleteCard: (statusId: number, cardId: number) => Promise<void>;
  moveCardInUI: (cardId: number, fromStatusId: number, toStatusId: number, toIndex: number) => Promise<void>;
  saveChangesToAPI: (cardId: number, fromStatusId: number, toStatusId: number) => Promise<void>;
  onUpdateStatus?: (statusId: number, data: { name?: string; color?: string }) => Promise<void>;
}

interface DragItem {
  type: string;
  cardId: number;
  fromStatusId: number;
  fromIndex: number;
}

const StatusColumn: React.FC<StatusColumnProps> = React.memo(({
  status,
  cards,
  index,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  moveCardInUI,
  saveChangesToAPI,
  onUpdateStatus,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(status.name);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isCreatingTop, setIsCreatingTop] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  // Drop zone для карточек
  const [{ isOver }, drop] = useDrop({
    accept: 'CARD',
    hover: (item: DragItem, monitor) => {
      if (!monitor.isOver({ shallow: true })) return;
      
      // Если карточка перетаскивается в пустую колонку
      if (item.fromStatusId !== status.id && cards.length === 0) {
        moveCardInUI(item.cardId, item.fromStatusId, status.id, 0);
        item.fromStatusId = status.id;
        item.fromIndex = 0;
      }
    },
    drop: (item: DragItem) => {
      console.log('🎯 Status column drop event:', { 
        statusId: status.id, 
        item: { cardId: item.cardId, fromStatusId: item.fromStatusId } 
      });
      
      // Сохраняем изменения в API
      saveChangesToAPI(item.cardId, item.fromStatusId, status.id);
      
      return { statusId: status.id, type: 'STATUS' };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const handleUpdateStatusName = useCallback(async () => {
    if (editName.trim() && editName !== status.name) {
      try {
        console.log('🔄 Обновляем имя статуса:', { old: status.name, new: editName });
        if (onUpdateStatus) {
          await onUpdateStatus(status.id, { name: editName.trim() });
          console.log('✅ Имя статуса обновлено в API');
        }
      } catch (error) {
        console.error('❌ Ошибка обновления имени статуса:', error);
        setEditName(status.name);
      }
    }
    setIsEditing(false);
  }, [editName, status.name, onUpdateStatus, status.id]);

  const handleCreateCard = useCallback(async (cardData: CreateCardRequest, position: 'top' | 'bottom' = 'bottom') => {
    try {
      await onCreateCard(status.id, cardData, position);
      setIsCardModalOpen(false);
      setIsCreatingTop(false);
    } catch (error) {
      console.error('❌ Ошибка создания карточки:', error);
    }
  }, [onCreateCard, status.id]);

  const handleDeleteCard = useCallback(async (cardId: number) => {
    try {
      await onDeleteCard(status.id, cardId);
    } catch (error) {
      console.error('❌ Ошибка удаления карточки:', error);
    }
  }, [onDeleteCard, status.id]);

  return (
    <div className="flex-shrink-0 w-80 bg-white rounded-lg shadow-sm border border-gray-200 p-3 group">
      {/* Заголовок колонки */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {/* Цветной кружок */}
          <ColorPicker
            selectedColor={status.color}
            onColorChange={async (color) => {
              console.log('🎨 Цвет статуса изменен:', { old: status.color, new: color });
              if (onUpdateStatus) {
                try {
                  await onUpdateStatus(status.id, { color });
                  console.log('✅ Цвет статуса обновлен в API');
                } catch (error) {
                  console.error('❌ Ошибка обновления цвета статуса:', error);
                }
              }
            }}
            isOpen={isColorPickerOpen}
            onToggle={() => setIsColorPickerOpen(!isColorPickerOpen)}
          />
          
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleUpdateStatusName}
              onKeyPress={(e) => e.key === 'Enter' && handleUpdateStatusName()}
              className="text-lg font-semibold text-gray-800 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
              autoFocus
            />
          ) : (
            <h3 
              className="text-lg font-semibold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors duration-200" 
              onDoubleClick={() => setIsEditing(true)}
              title="Двойной клик для редактирования"
            >
              {status.name}
            </h3>
          )}
        </div>
        <button
          onClick={() => setIsCreatingTop(true)}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200"
          title="Создать карточку вверху"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Карточки */}
      <div
        ref={drop}
        className={`space-y-0.5 w-full min-h-[100px] drop-zone ${
          isOver ? 'bg-blue-50 border-2 border-dashed border-blue-300 rounded-md' : ''
        }`}
      >
        {cards.map((card, cardIndex) => (
          <Card
            key={`card-${card.id}-${cardIndex}`}
            card={card}
            index={cardIndex}
            onUpdate={async (cardId: number, cardData: { title?: string; description?: string }) => onUpdateCard(cardId, cardData)}
            onDelete={async (cardId: number) => handleDeleteCard(cardId)}
            moveCardInUI={moveCardInUI}
            saveChangesToAPI={saveChangesToAPI}
          />
        ))}
        
        {/* Кнопка добавления карточки под карточками */}
        {cards.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setIsCardModalOpen(true)}
              className="w-full py-2 px-3 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center justify-center space-x-2"
              title="Добавить карточку"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">Добавить карточку</span>
            </button>
          </div>
        )}
      </div>

      {/* Кнопка добавления карточки когда карточек нет */}
      {cards.length === 0 && (
        <div className="mt-4">
          <button
            onClick={() => setIsCardModalOpen(true)}
            className="w-full py-2 px-3 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-all duration-200 flex items-center justify-center space-x-2"
            title="Добавить первую карточку"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">Добавить карточку</span>
          </button>
        </div>
      )}

      {/* Модальное окно создания карточки внизу */}
      <CardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        onCreateCard={(cardData) => handleCreateCard(cardData, 'bottom')}
        statusId={status.id}
      />

      {/* Модальное окно создания карточки вверху */}
      <CardModal
        isOpen={isCreatingTop}
        onClose={() => setIsCreatingTop(false)}
        onCreateCard={(cardData) => handleCreateCard(cardData, 'top')}
        statusId={status.id}
      />
    </div>
  );
});

export default StatusColumn;