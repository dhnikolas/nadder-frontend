import React, { useState, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { StatusResponse, CardResponse, CreateCardRequest } from '../../types/api';
import { Edit, Plus } from 'lucide-react';
import Card from './Card';
import CardModal from '../modals/CardModal';

interface StatusColumnProps {
  status: StatusResponse;
  cards: CardResponse[];
  index: number;
  onCreateCard: (statusId: number, cardData: CreateCardRequest) => Promise<void>;
  onUpdateCard: (cardId: number, cardData: { title?: string; description?: string }) => Promise<void>;
  onDeleteCard: (statusId: number, cardId: number) => Promise<void>;
  moveCardInUI: (cardId: number, fromStatusId: number, toStatusId: number, toIndex: number) => Promise<void>;
  saveChangesToAPI: (cardId: number, fromStatusId: number, toStatusId: number) => Promise<void>;
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
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(status.name);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

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
      } catch (error) {
        console.error('❌ Ошибка обновления имени статуса:', error);
        setEditName(status.name);
      }
    }
    setIsEditing(false);
  }, [editName, status.name]);

  const handleCreateCard = useCallback(async (cardData: CreateCardRequest) => {
    try {
      await onCreateCard(status.id, cardData);
      setIsCardModalOpen(false);
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
    <div className="flex-shrink-0 w-80 bg-white rounded-lg shadow-sm border border-gray-200 p-4 group">
      {/* Заголовок колонки */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
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
            <h3 className="text-lg font-semibold text-gray-800 cursor-pointer hover:text-blue-600" onClick={() => setIsEditing(true)}>
              {status.name}
            </h3>
          )}
          <button
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-gray-100 rounded"
            title="Редактировать название"
          >
            <Edit className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {cards.length}
        </span>
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

      {/* Модальное окно создания карточки */}
      <CardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        onCreateCard={handleCreateCard}
        statusId={status.id}
      />
    </div>
  );
});

export default StatusColumn;