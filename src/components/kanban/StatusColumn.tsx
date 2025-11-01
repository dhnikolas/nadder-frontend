import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDrop, useDrag } from 'react-dnd';
import { createPortal } from 'react-dom';
import { StatusResponse, CardResponse, CreateCardRequest, UpdateStatusRequest } from '../../types/api';
import { Plus, MoreVertical } from 'lucide-react';
import Card from './Card';
import ColorPicker from '../common/ColorPicker';
import { useDragIndicator } from '../../contexts/DragIndicatorContext';

interface StatusColumnProps {
  status: StatusResponse;
  cards: CardResponse[];
  index: number;
  isLastStatus?: boolean;
  onCreateCard: (statusId: number, cardData: CreateCardRequest, position?: 'top' | 'bottom') => Promise<void>;
  onUpdateCard: (cardId: number, cardData: { title?: string; description?: string }) => Promise<void>;
  onDeleteCard: (statusId: number, cardId: number) => Promise<void>;
  moveCardInUI: (cardId: number, fromStatusId: number, toStatusId: number, toIndex: number) => Promise<void>;
  saveChangesToAPI: (cardId: number, fromStatusId: number, toStatusId: number) => Promise<void>;
  onUpdateStatus?: (statusId: number, data: UpdateStatusRequest) => Promise<void>;
  onDeleteStatus?: (statusId: number) => Promise<void>;
  onMoveStatus?: (fromIndex: number, toIndex: number) => void;
  onCreateCardClick: (statusId: number, position: 'top' | 'bottom') => void;
  onCardClick: (card: CardResponse) => void;
}

interface DragItem {
  type: string;
  cardId: number;
  fromStatusId: number;
  fromIndex: number;
}

interface StatusDragItem {
  type: string;
  statusId: number;
  index: number;
}

const StatusColumn: React.FC<StatusColumnProps> = React.memo(({
  status,
  cards,
  index,
  isLastStatus = false,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  moveCardInUI,
  saveChangesToAPI,
  onUpdateStatus,
  onDeleteStatus,
  onMoveStatus,
  onCreateCardClick,
  onCardClick,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(status.name);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(status.collapsed || false);

  // Синхронизируем состояние свернутости с пропсом
  useEffect(() => {
    setIsCollapsed(status.collapsed || false);
  }, [status.collapsed]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const statusColumnRef = useRef<HTMLDivElement>(null);
  const { activeIndicator, setActiveIndicator, clearAllIndicators } = useDragIndicator();
  
  const indicatorId = `status-${status.id}`;

  // Drag для статуса через кнопку с тремя точками
  const [{ isDraggingStatus }, dragStatus] = useDrag<StatusDragItem, void, { isDraggingStatus: boolean }>({
    type: 'STATUS',
    item: (): StatusDragItem => ({
      type: 'STATUS',
      statusId: status.id,
      index: index,
    }),
    collect: (monitor) => ({
      isDraggingStatus: monitor.isDragging(),
    }),
  });

  // Закрываем меню при начале перетаскивания
  useEffect(() => {
    if (isDraggingStatus) {
      setIsMenuOpen(false);
    }
  }, [isDraggingStatus]);

  // Drop zone для статусов
  const [{ handlerId: statusHandlerId }, dropStatus] = useDrop<StatusDragItem, void, { handlerId: string | symbol | null }>({
    accept: 'STATUS',
    collect: (monitor) => ({
      handlerId: monitor.getHandlerId(),
    }),
    hover: (item: StatusDragItem, monitor) => {
      if (!statusColumnRef.current || !onMoveStatus) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;

      // Не заменяем элементы самими собой
      if (dragIndex === hoverIndex) {
        return;
      }

      // Определяем прямоугольник на экране
      const hoverBoundingRect = statusColumnRef.current.getBoundingClientRect();

      // Получаем вертикальную середину
      const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;

      // Определяем позицию курсора
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) {
        return;
      }

      // Получаем пиксели слева
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;

      // Перемещаем только когда мышь пересекла 50% ширины элемента
      // Перетаскиваем вправо
      if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX * 0.5) {
        return;
      }

      // Перетаскиваем влево
      if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX * 1.5) {
        return;
      }

      // Время для фактического выполнения действия
      onMoveStatus(dragIndex, hoverIndex);

      // Примечание: мы мутируем item здесь!
      item.index = hoverIndex;
    },
  });

  // Прикрепляем drag к кнопке с тремя точками
  useEffect(() => {
    if (menuButtonRef.current) {
      dragStatus(menuButtonRef.current);
    }
  }, [dragStatus]);

  // Прикрепляем drop к колонке статуса
  useEffect(() => {
    if (statusColumnRef.current) {
      dropStatus(statusColumnRef.current);
    }
  }, [dropStatus]);

  // Обновляем позицию меню при открытии
  useEffect(() => {
    if (isMenuOpen && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }, [isMenuOpen]);

  // Закрываем меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && 
          menuButtonRef.current && !menuButtonRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Обновляем позицию меню при прокрутке
  useEffect(() => {
    if (isMenuOpen && menuButtonRef.current) {
      const updatePosition = () => {
        if (menuButtonRef.current) {
          const rect = menuButtonRef.current.getBoundingClientRect();
          setMenuPosition({
            top: rect.bottom + window.scrollY + 4,
            left: rect.left + window.scrollX,
          });
        }
      };

      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isMenuOpen]);

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
              setActiveIndicator(indicatorId);
            } else {
              if (activeIndicator === indicatorId) {
                setActiveIndicator(null);
              }
            }
    },
    drop: (item: DragItem) => {
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
        if (onUpdateStatus) {
          await onUpdateStatus(status.id, { name: editName.trim() });
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

  const handleDeleteStatus = useCallback(async () => {
    if (!onDeleteStatus) return;
    
    if (!window.confirm(`Вы уверены, что хотите удалить статус "${status.name}"?`)) {
      setIsMenuOpen(false);
      return;
    }

    try {
      await onDeleteStatus(status.id);
      setIsMenuOpen(false);
    } catch (error) {
      console.error('❌ Ошибка удаления статуса:', error);
      setIsMenuOpen(false);
    }
  }, [onDeleteStatus, status.id, status.name]);

  return (
    <div 
      ref={statusColumnRef}
      className="flex-shrink-0 w-80 relative"
      style={{ opacity: isDraggingStatus ? 0.5 : 1 }}
      data-handler-id={statusHandlerId}
    >
      {/* Визуальная часть - только карточки */}
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-2 self-start relative transition-all duration-200 ${isCollapsed ? 'min-h-[60px]' : 'min-h-[200px]'}`}>
        {/* Заголовок колонки */}
        <div className="flex items-center justify-between mb-2" style={{ zIndex: 10, position: 'relative' }}>
          <div className="flex items-center space-x-1 flex-1">
            {/* Кнопка меню (ручка для перетаскивания) */}
            <div className="relative">
              <button
                ref={menuButtonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  // Открываем меню только если не было перетаскивания
                  if (!isDraggingStatus) {
                    setIsMenuOpen(!isMenuOpen);
                  }
                }}
                onMouseDown={(e) => {
                  // Разрешаем перетаскивание при зажатии кнопки
                  e.stopPropagation();
                }}
                className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200 flex-shrink-0"
                title="Перетащить статус или открыть меню"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            
            {/* Цветной кружок */}
            <ColorPicker
              selectedColor={status.color}
              onColorChange={async (color) => {
                if (onUpdateStatus) {
                  try {
                    await onUpdateStatus(status.id, { color });
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
          {!isCollapsed && (
            <button
              onClick={() => onCreateCardClick(status.id, 'top')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200"
              title="Создать карточку вверху"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
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
        {!isCollapsed && (
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
        )}
        
        {/* Показываем счетчик карточек при свернутом состоянии */}
        {isCollapsed && cards.length > 0 && (
          <div className="text-sm text-gray-500 px-1 py-2">
            {cards.length} {cards.length === 1 ? 'задача' : cards.length < 5 ? 'задачи' : 'задач'}
          </div>
        )}
      </div>

      {/* Кнопка добавления карточки под визуальной частью - только при наведении на неё */}
      {!isCollapsed && (
        <div 
          className={`mt-1 w-full transition-opacity duration-200 ${isButtonHovered && !isOver ? 'opacity-100' : 'opacity-0'}`}
          style={{ zIndex: 30, pointerEvents: 'auto', position: 'relative' }}
          onMouseEnter={() => {
            setIsButtonHovered(true);
          }}
          onMouseLeave={() => {
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
      )}

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

      {/* Выпадающее меню статуса */}
      {isMenuOpen && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg z-[9998] min-w-[160px] py-1"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
          }}
        >
          <button
            onClick={async (e) => {
              e.stopPropagation();
              const newCollapsedState = !isCollapsed;
              setIsCollapsed(newCollapsedState);
              setIsMenuOpen(false);
              
              // Сохраняем состояние свернутости в API
              if (onUpdateStatus) {
                try {
                  await onUpdateStatus(status.id, { collapsed: newCollapsedState });
                } catch (error) {
                  console.error('❌ Ошибка обновления состояния свернутости:', error);
                  // Откатываем изменение при ошибке
                  setIsCollapsed(!newCollapsedState);
                }
              }
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center"
          >
            {isCollapsed ? 'Развернуть' : 'Свернуть'}
          </button>
          {onDeleteStatus && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteStatus();
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center"
            >
              Удалить статус
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
});

export default StatusColumn;