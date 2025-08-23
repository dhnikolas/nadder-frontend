import React, { useState, useRef, useCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { CardResponse } from '../../types/api';
import { Trash2 } from 'lucide-react';
import CardModal from '../modals/CardModal';

interface CardProps {
  card: CardResponse;
  index: number;
  onUpdate: (cardId: number, cardData: { title?: string; description?: string }) => Promise<void>;
  onDelete: (cardId: number) => Promise<void>;
  moveCardInUI: (cardId: number, fromStatusId: number, toStatusId: number, toIndex: number) => Promise<void>;
  saveChangesToAPI: (cardId: number, fromStatusId: number, toStatusId: number) => Promise<void>;
}

interface DragItem {
  type: string;
  cardId: number;
  fromStatusId: number;
  fromIndex: number;
}

const Card: React.FC<CardProps> = React.memo(({ 
  card, 
  index, 
  onUpdate, 
  onDelete, 
  moveCardInUI,
  saveChangesToAPI
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Drag functionality
  const [{ isDragging }, drag] = useDrag({
    type: 'CARD',
    item: (): DragItem => ({
      type: 'CARD',
      cardId: card.id,
      fromStatusId: card.status_id,
      fromIndex: index,
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      console.log('🃏 Drag ended for card:', card.title);
      
      // Проверяем, была ли карточка успешно перемещена
      const dropResult = monitor.getDropResult();
      if (dropResult) {
        console.log('✅ Card dropped successfully:', dropResult);
        // API вызов будет сделан в drop callback
      } else {
        console.log('❌ Card drop cancelled');
      }
    },
  });

  // Drop functionality
  const [{ isOver }, drop] = useDrop({
    accept: 'CARD',
    hover: (item: DragItem, monitor) => {
      console.log('🎯 Hover event:', { item, currentCard: card.id, currentIndex: index });
      
      if (!ref.current) {
        console.log('❌ No ref.current');
        return;
      }
      
      const dragIndex = item.fromIndex;
      const hoverIndex = index;
      const dragStatusId = item.fromStatusId;
      const hoverStatusId = card.status_id;

      // Не заменяем элементы самими собой
      if (item.cardId === card.id) {
        console.log('🚫 Same card, skipping');
        return;
      }

      // Определяем позицию курсора относительно элемента
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      
      if (!clientOffset) {
        console.log('❌ No client offset');
        return;
      }
      
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // При перетаскивании вниз, срабатываем только когда курсор ниже 50%
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        console.log('⬇️ Dragging down but cursor above middle, skipping');
        return;
      }
      
      // При перетаскивании вверх, срабатываем только когда курсор выше 50%
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        console.log('⬆️ Dragging up but cursor below middle, skipping');
        return;
      }

      // Выполняем перемещение в UI
      console.log('🔄 Moving card in hover:', {
        cardId: item.cardId,
        from: { statusId: dragStatusId, index: dragIndex },
        to: { statusId: hoverStatusId, index: hoverIndex }
      });

      moveCardInUI(item.cardId, dragStatusId, hoverStatusId, hoverIndex);

      // Обновляем индексы для последующих hover events
      item.fromStatusId = hoverStatusId;
      item.fromIndex = hoverIndex;
    },
    drop: (item: DragItem) => {
      console.log('🎯 Card drop event:', { 
        targetCard: { id: card.id, title: card.title, statusId: card.status_id },
        draggedItem: { cardId: item.cardId, fromStatusId: item.fromStatusId } 
      });
      
      // Сохраняем изменения в API
      saveChangesToAPI(item.cardId, item.fromStatusId, card.status_id);
      
      return { cardId: card.id, statusId: card.status_id, type: 'CARD' };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Объединяем drag и drop refs
  const dragDropRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      drag(drop(node));
    }
  }, [drag, drop]);

  const handleCardClick = () => {
    if (!isDragging) {
      console.log('🃏 Card clicked - opening modal:', card.title);
      setIsEditModalOpen(true);
    }
  };

  const cardTitle = card.title || 'Без названия';
  const cardDescription = card.description || '';

  return (
    <>
      <div
        ref={dragDropRef}
        className={`
          bg-white border border-gray-200 rounded-lg p-3 cursor-pointer
          hover:shadow-md transition-all duration-200
          ${isDragging ? 'opacity-50 rotate-2 shadow-lg' : ''}
          ${isOver ? 'border-blue-300 bg-blue-50' : ''}
        `}
        onClick={handleCardClick}
        title={cardTitle}
      >
        <div className="flex justify-between items-start mb-2">
          <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1 mr-2">
            {cardTitle}
          </h4>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('Удалить карточку?')) {
                onDelete(card.id);
              }
            }}
            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Удалить"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
        
        {cardDescription && (
          <p className="text-xs text-gray-600 line-clamp-3 mt-1">
            {cardDescription}
          </p>
        )}
        
        <div className="flex justify-end mt-2 text-xs text-gray-400">
          <span>#{card.id}</span>
        </div>
      </div>

      {/* Модальное окно редактирования */}
      <CardModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={async (cardId, cardData) => {
          await onUpdate(cardId, cardData);
          setIsEditModalOpen(false);
        }}
        card={card}
        statusId={card.status_id}
      />
    </>
  );
});

export default Card;