import React, { useState, useCallback, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { StatusResponse, CardResponse, CreateCardRequest } from '../../types/api';
import { Plus } from 'lucide-react';
import Card from './Card';
import ColorPicker from '../common/ColorPicker';
import { useDragIndicator } from '../../contexts/DragIndicatorContext';

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
  onCreateCardClick: (statusId: number, position: 'top' | 'bottom') => void;
  onCardClick: (card: CardResponse) => void;
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
  onCreateCardClick,
  onCardClick,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(status.name);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const { activeIndicator, setActiveIndicator, clearAllIndicators } = useDragIndicator();
  
  const indicatorId = `status-${status.id}`;

  // Drop zone для карточек
  const [{ isOver }, drop] = useDrop({
    accept: 'CARD',
    hover: (item: DragItem, monitor) => {
      if (!monitor.isOver({ shallow: true })) {
        if (activeIndicator === indicatorId) {
          setActiveIndicator(null);
        }
        return;
      }
      
      // Если карточка перетаскивается в другой статус
      if (item.fromStatusId !== status.id) {
        console.log('🎯 Showing drop indicator for status:', status.name);
        setActiveIndicator(indicatorId);
      } else {
        if (activeIndicator === indicatorId) {
          setActiveIndicator(null);
        }
      }
    },
    drop: (item: DragItem) => {
      console.log('🎯 Status column drop event:', { 
        statusId: status.id, 
        item: { cardId: item.cardId, fromStatusId: item.fromStatusId } 
      });
      
      // Очищаем все индикаторы
      clearAllIndicators();
      
      // Если карточка перетаскивается в другой статус
      if (item.fromStatusId !== status.id) {
        // Сначала обновляем UI
        moveCardInUI(item.cardId, item.fromStatusId, status.id, cards.length);
        // Затем сохраняем в API
        saveChangesToAPI(item.cardId, item.fromStatusId, status.id);
      }
      
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


  const handleDeleteCard = useCallback(async (cardId: number) => {
    try {
      await onDeleteCard(status.id, cardId);
    } catch (error) {
      console.error('❌ Ошибка удаления карточки:', error);
    }
  }, [onDeleteCard, status.id]);

  return (
    <div className="flex-shrink-0 w-80 relative">
      {/* Визуальная часть - только карточки */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 self-start relative min-h-[200px]">
        {/* Заголовок колонки */}
        <div className="flex items-center justify-between mb-2" style={{ zIndex: 10, position: 'relative' }}>
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
            onClick={() => onCreateCardClick(status.id, 'top')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200"
            title="Создать карточку вверху"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Drop зона для карточек - только в визуальной части */}
        <div
          className="absolute drop-zone"
          style={{ 
            pointerEvents: 'auto',
            zIndex: 0,
            top: '48px',
            left: '0px',
            right: '0px',
            bottom: '0px',
            minHeight: '200px'
          }}
        />

        {/* Карточки - визуальная часть */}
        <div className="space-y-0.5 w-full relative" style={{ zIndex: 10, pointerEvents: 'auto' }}>
          {cards.map((card, cardIndex) => (
            <Card
              key={card.id}
              card={card}
              index={cardIndex}
              onUpdate={async (cardId: number, cardData: { title?: string; description?: string }) => onUpdateCard(cardId, cardData)}
              onDelete={async (cardId: number) => handleDeleteCard(cardId)}
              moveCardInUI={moveCardInUI}
              saveChangesToAPI={saveChangesToAPI}
              onCardClick={onCardClick}
            />
          ))}
        </div>
      </div>

      {/* Кнопка добавления карточки под визуальной частью - только при наведении на неё */}
      <div 
        className={`mt-1 w-full transition-opacity duration-200 ${isButtonHovered && !isOver ? 'opacity-100' : 'opacity-0'}`}
        style={{ zIndex: 30, pointerEvents: 'auto', position: 'relative' }}
        onMouseEnter={() => {
          console.log('🖱️ Mouse enter on button area');
          setIsButtonHovered(true);
        }}
        onMouseLeave={() => {
          console.log('🖱️ Mouse leave from button area');
          setIsButtonHovered(false);
        }}
      >
        <button
          onClick={() => onCreateCardClick(status.id, 'bottom')}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 shadow-sm"
          title="Добавить карточку"
        >
          <Plus className="h-4 w-4" />
          <span>Добавить карточку</span>
        </button>
      </div>

      {/* Фактическая часть - на всю высоту страницы + 300px (невидимая) */}
      <div 
        className="absolute top-0 left-0 w-full"
        style={{ 
          height: 'calc(100vh + 300px)',
          zIndex: 1
        }}
      />

      {/* Drop зона - на всю высоту блока + 300px, но не перекрывает заголовок и кнопку */}
      <div
        ref={drop}
        className="absolute drop-zone"
        style={{ 
          pointerEvents: 'auto',
          zIndex: 1, // Ниже заголовка
          top: '48px', // Начинается после заголовка статуса
          left: '0px',
          right: '0px',
          bottom: '60px', // Оставляем место для кнопки
          height: 'calc(100vh + 300px - 48px - 60px)', // Учитываем заголовок и кнопку
          minHeight: '200px'
        }}
      />

    </div>
  );
});

export default StatusColumn;