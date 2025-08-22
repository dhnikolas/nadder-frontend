import React, { useState, useMemo } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { CardResponse } from '../../types/api';
import CardModal from '../modals/CardModal';

interface CardProps {
  card: CardResponse;
  index: number;
  onUpdate: (cardId: number, cardData: { title?: string; description?: string }) => Promise<void>;
  onDelete: () => Promise<void>;
  isDragEnabled?: boolean;
}

const Card: React.FC<CardProps> = React.memo(({ card, index, onUpdate, onDelete, isDragEnabled = true }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleCardClick = () => {
    setIsEditModalOpen(true);
  };

  // Мемоизируем title для предотвращения ненужных перерисовок
  const cardTitle = useMemo(() => {
    return card.description ? `${card.title}\n\n${card.description}` : card.title;
  }, [card.title, card.description]);

  return (
    <>
      {isDragEnabled ? (
        <Draggable draggableId={card.id.toString()} index={index}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className={`bg-white border border-gray-200 rounded-md p-2 mb-1 shadow-sm hover:shadow-md cursor-pointer w-full max-w-full max-h-32 overflow-hidden card ${
                snapshot.isDragging ? 'card-dragging' : ''
              }`}
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
          )}
        </Draggable>
      ) : (
        <div
          className="bg-white border border-gray-200 rounded-md p-2 mb-1 shadow-sm hover:shadow-md cursor-pointer w-full max-w-full max-h-32 overflow-hidden"
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
      )}

      <CardModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        card={card}
        onUpdate={onUpdate}
        onDelete={async (cardId: number) => {
          await onDelete();
        }}
      />
    </>
  );
});

export default Card;
