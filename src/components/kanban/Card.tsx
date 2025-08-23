import React, { useState, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { CardResponse } from '../../types/api';
import CardModal from '../modals/CardModal';

interface CardProps {
  card: CardResponse;
  index: number;
  onUpdate: (cardId: number, cardData: { title?: string; description?: string }) => Promise<void>;
  onDelete: (cardId: number) => Promise<void>;
  onMoveCard: (dragIndex: number, hoverIndex: number, fromStatusId: number, toStatusId: number) => void;
  isDragEnabled?: boolean;
}

interface DragItem {
  type: string;
  id: number;
  index: number;
  statusId: number;
}

const Card: React.FC<CardProps> = React.memo(({ 
  card, 
  index, 
  onUpdate, 
  onDelete, 
  onMoveCard,
  isDragEnabled = true 
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [{ isDragging }, drag] = useDrag({
    type: 'CARD',
    item: (): DragItem => ({
      type: 'CARD',
      id: card.id,
      index,
      statusId: card.status_id,
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: isDragEnabled,
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'CARD',
    hover: (item: DragItem) => {
      if (!isDragEnabled) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;
      const fromStatusId = item.statusId;
      const toStatusId = card.status_id;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex && fromStatusId === toStatusId) {
        return;
      }

      // Call the move function
      onMoveCard(dragIndex, hoverIndex, fromStatusId, toStatusId);

      // Update the item's index for further hovers
      item.index = hoverIndex;
      item.statusId = toStatusId;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const handleCardClick = () => {
    if (!isDragging) {
      console.log('🃏 Card clicked - opening modal:', card.title);
      setIsEditModalOpen(true);
    }
  };

  const handleUpdate = async (cardId: number, cardData: { title?: string; description?: string }) => {
    await onUpdate(cardId, cardData);
    setIsEditModalOpen(false);
  };

  const handleDelete = async (cardId: number) => {
    await onDelete(cardId);
    setIsEditModalOpen(false);
  };

  // Формируем текст для tooltip
  const cardTitle = useMemo(() => {
    return card.description ? `${card.title}\n\n${card.description}` : card.title;
  }, [card.title, card.description]);

  // Объединяем drag и drop refs
  const dragDropRef = (node: HTMLDivElement | null) => {
    drag(drop(node));
  };

  return (
    <>
      {/* Карточка с поддержкой drag and drop */}
      <div
        ref={dragDropRef}
        className={`bg-white border border-gray-200 rounded-md p-2 mb-1 shadow-sm hover:shadow-md cursor-pointer w-full max-w-full max-h-32 overflow-hidden card ${
          isDragging ? 'opacity-50 shadow-lg' : ''
        } ${isOver ? 'border-blue-300 bg-blue-50' : ''} ${!isDragEnabled ? 'opacity-75' : ''}`}
        onClick={handleCardClick}
        title={cardTitle}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 overflow-hidden relative">
            <h4 className="font-medium text-gray-900 text-sm mb-1 break-words line-clamp-1">
              {card.title}
            </h4>
            {card.description && (
              <div className="max-h-16 overflow-hidden relative">
                <p className="text-sm text-gray-600 break-words whitespace-pre-wrap line-clamp-3">
                  {card.description}
                </p>
                {/* Градиент для индикации обрезанного текста */}
                <div className="absolute bottom-0 left-0 right-0 h-4 card-gradient pointer-events-none"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно редактирования карточки */}
      <CardModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        card={card}
      />
    </>
  );
});

export default Card;
