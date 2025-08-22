import React, { useState, memo } from 'react';
import { Plus, Edit } from 'lucide-react';
import { Droppable } from 'react-beautiful-dnd';
import { StatusResponse, CardResponse, CreateCardRequest } from '../../types/api';
import Card from './Card';
import CardModal from '../modals/CardModal';

interface StatusColumnProps {
  status: StatusResponse;
  cards: CardResponse[];
  index: number;
  onCreateCard: (statusId: number, cardData: CreateCardRequest) => Promise<void>;
  onUpdateCard: (cardId: number, cardData: { title?: string; description?: string }) => Promise<void>;
  onDeleteCard: (statusId: number, cardId: number) => Promise<void>;
  isDragEnabled?: boolean;
}

const StatusColumn: React.FC<StatusColumnProps> = memo(({
  status,
  cards,
  index,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  isDragEnabled = true,
}) => {
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(status.name);

  const handleCreateCard = async (cardData: CreateCardRequest) => {
    await onCreateCard(status.id, cardData);
    setIsCardModalOpen(false);
  };

  const handleDeleteCard = async (cardId: number) => {
    await onDeleteCard(status.id, cardId);
  };

  const handleUpdateStatusName = async () => {
    if (editName.trim() && editName !== status.name) {
      // Здесь можно добавить вызов API для обновления названия статуса
      // await onUpdateStatus(status.id, { name: editName });
    }
    setIsEditing(false);
  };

  return (
    <div className="w-80 bg-gray-100 rounded-lg p-2 flex-shrink-0 group">
      {/* Заголовок колонки */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleUpdateStatusName}
              onKeyPress={(e) => e.key === 'Enter' && handleUpdateStatusName()}
              className="font-medium text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 text-sm w-full"
              autoFocus
            />
          ) : (
            <h3 className="font-medium text-gray-900 break-words overflow-hidden">{status.name}</h3>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Редактировать название"
          >
            <Edit className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Карточки */}
      {isDragEnabled ? (
        <Droppable droppableId={status.id.toString()}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-0.5 w-full min-h-[100px] drop-zone ${
                snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-200' : ''
              }`}
            >
              {cards.map((card, index) => (
                <Card
                  key={`card-${card.id}-${index}`}
                  card={card}
                  index={index}
                  onUpdate={onUpdateCard}
                  onDelete={() => onDeleteCard(status.id, card.id)}
                  isDragEnabled={isDragEnabled}
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
              
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      ) : (
        <div className="space-y-0.5 w-full min-h-[100px]">
          {cards.map((card, index) => (
            <Card
              key={`card-${card.id}-${index}`}
              card={card}
              index={index}
              onUpdate={onUpdateCard}
              onDelete={() => onDeleteCard(status.id, card.id)}
              isDragEnabled={false}
            />
          ))}
          
          {/* Кнопка добавления карточки под карточками (когда drag and drop отключен) */}
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
      )}

      {/* Кнопка добавления карточки когда карточек нет */}
      {cards.length === 0 && (
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

      {/* Модальное окно создания карточки */}
      <CardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        onCreateCard={handleCreateCard}
        onDelete={handleDeleteCard}
        statusId={status.id}
      />
    </div>
  );
});

export default StatusColumn;
