import React, { useRef, useCallback, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { CardResponse } from '../../types/api';
import { Trash2 } from 'lucide-react';
import { useDragIndicator } from '../../contexts/DragIndicatorContext';

interface CardProps {
  card: CardResponse;
  index: number;
  onUpdate: (cardId: number, cardData: { title?: string; description?: string }) => Promise<void>;
  onDelete: (cardId: number) => Promise<void>;
  moveCardInUI: (cardId: number, fromStatusId: number, toStatusId: number, toIndex: number) => Promise<void>;
  saveChangesToAPI: (cardId: number, fromStatusId: number, toStatusId: number) => Promise<void>;
  onCardClick: (card: CardResponse) => void;
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
  saveChangesToAPI,
  onCardClick
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const { activeIndicator, setActiveIndicator, clearAllIndicators } = useDragIndicator();
  
  const indicatorId = `card-${card.id}`;

  // Drag functionality
  const [{ isDragging }, drag] = useDrag({
    type: 'CARD',
    item: (): DragItem => {
      // Очищаем все индикаторы при начале drag
      clearAllIndicators();
      
      return {
        type: 'CARD',
        cardId: card.id,
        fromStatusId: card.status_id,
        fromIndex: index,
      };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
          end: (item, monitor) => {
            // Очищаем все индикаторы при завершении drag
            clearAllIndicators();
            
            // Проверяем, была ли карточка успешно перемещена
            const dropResult = monitor.getDropResult();
            if (dropResult) {
              // API вызов будет сделан в drop callback
            }
          },
  });


  // Drop functionality
  const [{ isOver }, drop] = useDrop({
    accept: 'CARD',
    hover: (item: DragItem, monitor) => {
      if (!ref.current) {
        return;
      }
      
      const dragIndex = item.fromIndex;
      const hoverIndex = index;
      const dragStatusId = item.fromStatusId;
      const hoverStatusId = card.status_id;

      // Не заменяем элементы самими собой
      if (item.cardId === card.id) {
        return;
      }

      // Проверяем, что карточки в одном статусе для сортировки
      if (dragStatusId !== hoverStatusId) {
        return;
      }

            // Определяем позицию курсора относительно элемента
            const hoverBoundingRect = ref.current.getBoundingClientRect();
      
      const clientOffset = monitor.getClientOffset();
      
      if (!clientOffset) {
        return;
      }
      
      const hoverClientY = clientOffset.y;

            // Фиксированный порог в пикселях для карточек разной высоты
            const threshold = 10; // 10px порог для всех карточек
      const topThreshold = hoverBoundingRect.top + threshold;
      const bottomThreshold = hoverBoundingRect.bottom - threshold;

            // Логика показа индикаторов при пересечении 10px зоны в любом направлении
            if (dragIndex < hoverIndex && hoverClientY < topThreshold) {
              // Перетаскиваем вниз, курсор в верхних 10px - показываем индикатор сверху
              setActiveIndicator(`${indicatorId}-top`);
            } else if (dragIndex > hoverIndex && hoverClientY > bottomThreshold) {
              // Перетаскиваем вверх, курсор в нижних 10px - показываем индикатор снизу
              setActiveIndicator(`${indicatorId}-bottom`);
            } else {
              // Скрываем индикатор если курсор не в зоне срабатывания
              if (activeIndicator?.startsWith(indicatorId)) {
                setActiveIndicator(null);
              }
            }
    },
    drop: (item: DragItem) => {
      // Определяем позицию вставки на основе последнего показанного индикатора
      let newIndex = index;
      
      if (activeIndicator?.includes('bottom')) {
        // При перетаскивании вверх (bottom индикатор) - вставляем после текущей карточки
        newIndex = index + 1;
      } else if (activeIndicator?.includes('top')) {
        // При перетаскивании вниз (top индикатор) - вставляем перед текущей карточкой
        newIndex = index;
      }
      
      // Выполняем перемещение только при drop
      if (item.fromStatusId !== card.status_id || newIndex !== item.fromIndex) {
        moveCardInUI(item.cardId, item.fromStatusId, card.status_id, newIndex);
        saveChangesToAPI(item.cardId, item.fromStatusId, card.status_id);
      }
      
      // Очищаем все индикаторы
      clearAllIndicators();
      
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
        onCardClick(card);
      }
    };

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const cardTitle = card.title || 'Без названия';
  const cardDescription = card.description || '';

  return (
    <>
      <div
        ref={dragDropRef}
        data-card-id={card.id}
        className={`
          bg-white border border-gray-200 rounded-lg px-3 py-2 cursor-pointer
          hover:shadow-md transition-all duration-200
          ${isDragging ? 'opacity-50 rotate-2 shadow-lg' : ''}
          ${isOver ? 'border-blue-300 bg-blue-50' : ''}
        `}
        style={{ minHeight: '90px', height: '90px' }}
        onClick={handleCardClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={cardTitle}
      >
        <div className="flex justify-between items-start mb-2 h-6">
                <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1 mr-2 leading-tight">
                  {cardTitle}
                </h4>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('Удалить карточку?')) {
                onDelete(card.id);
              }
            }}
            className={`p-1.5 hover:bg-red-100 rounded-md text-gray-400 hover:text-red-600 transition-all duration-200 flex-shrink-0 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
            title="Удалить карточку"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col justify-start mt-3">
          {cardDescription && (
            <p className="text-xs text-gray-600 line-clamp-2 mb-2">
              {cardDescription}
            </p>
          )}
        </div>
        
      </div>

    </>
  );
}, (prevProps, nextProps) => {
  // Сравниваем только важные свойства для предотвращения ненужных перерендеров
  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.card.title === nextProps.card.title &&
    prevProps.card.description === nextProps.card.description &&
    prevProps.card.status_id === nextProps.card.status_id &&
    prevProps.index === nextProps.index
  );
});

export default Card;