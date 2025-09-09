import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StatusResponse, CardResponse, CreateCardRequest, BulkCardSortRequest } from '../../types/api';
import { apiService } from '../../services/api';
import StatusColumn from './StatusColumn';
import CreateStatusButton from './CreateStatusButton';
import CardModal from '../modals/CardModal';

interface KanbanBoardProps {
  pipelineId: number;
  projectId: number;
  cardToOpen?: number | null;
  onCardOpened?: () => void;
}

interface CardsData {
  [statusId: number]: CardResponse[];
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ pipelineId, projectId, cardToOpen, onCardOpened }) => {
  
  const [statuses, setStatuses] = useState<StatusResponse[]>([]);
  const [cards, setCards] = useState<CardsData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [createCardStatusId, setCreateCardStatusId] = useState<number | null>(null);
  const [createCardPosition, setCreateCardPosition] = useState<'top' | 'bottom'>('bottom');
  const [selectedCard, setSelectedCard] = useState<CardResponse | null>(null);
  const lastLoadRef = useRef<{ projectId: number; pipelineId: number } | null>(null);
  const loadingRef = useRef<boolean>(false); // Флаг активной загрузки

  // Загрузка статусов и карточек
  const loadData = useCallback(async () => {
    // Проверяем, не загружали ли мы уже данные для этих параметров
    if (lastLoadRef.current?.projectId === projectId && lastLoadRef.current?.pipelineId === pipelineId) {
      return;
    }
    
    // Проверяем, не идет ли уже загрузка
    if (loadingRef.current) {
      return;
    }
    
    try {
      loadingRef.current = true;
      setIsLoading(true);
      
      // Загружаем статусы и карточки параллельно
      const [statusesResponse, pipelineCardsResponse] = await Promise.all([
        apiService.getStatuses(projectId, pipelineId),
        apiService.getPipelineCards(projectId, pipelineId)
      ]);
      
      setStatuses(statusesResponse || []);
      
      // Группируем карточки по статусам
      const groupedCards: CardsData = {};
      
      // Инициализируем пустые массивы для всех статусов
      if (statusesResponse && Array.isArray(statusesResponse)) {
        statusesResponse.forEach(status => {
          groupedCards[status.id] = [];
        });
      } else {
      }
      
      // Распределяем карточки по статусам и сортируем
      if (pipelineCardsResponse.cards && Array.isArray(pipelineCardsResponse.cards)) {
        pipelineCardsResponse.cards.forEach(card => {
          if (groupedCards[card.status_id]) {
            groupedCards[card.status_id].push(card);
          }
        });
        
        // Сортируем карточки в каждом статусе по sort_order
        Object.keys(groupedCards).forEach(statusId => {
          const statusIdNum = parseInt(statusId);
          groupedCards[statusIdNum].sort((a, b) => a.sort_order - b.sort_order);
        });
      } else {
      }
      
      setCards(groupedCards);
      
      // Сохраняем информацию о последней загрузке
      lastLoadRef.current = { projectId, pipelineId };
    } catch (error) {
      console.error('❌ Error loading data:', error);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [pipelineId, projectId]);

  useEffect(() => {
    if (projectId && pipelineId) {
      loadData();
    } else {
    }
  }, [loadData, projectId, pipelineId]);

  // Автоматическое открытие карточки из поиска
  useEffect(() => {
    if (cardToOpen && !isLoading && Object.keys(cards).length > 0) {
      
      // Находим карточку во всех статусах
      let targetCard: CardResponse | null = null;
      for (const statusCards of Object.values(cards)) {
        const card = statusCards.find((c: CardResponse) => c.id === cardToOpen);
        if (card) {
          targetCard = card;
          break;
        }
      }
      
      if (targetCard) {
        // Симулируем клик по карточке
        const cardElement = document.querySelector(`[data-card-id="${cardToOpen}"]`);
        if (cardElement) {
          (cardElement as HTMLElement).click();
        }
        
        // Уведомляем Dashboard, что карточка открыта
        if (onCardOpened) {
          onCardOpened();
        }
      } else {
      }
    }
  }, [cardToOpen, isLoading, cards, onCardOpened]);

  // Логирование mount/unmount компонента
  useEffect(() => {
    return () => {
      // Сбрасываем флаги при размонтировании
      loadingRef.current = false;
      lastLoadRef.current = null;
    };
  }, [projectId, pipelineId]);

  // Создание карточки
  const handleCreateCard = useCallback(async (statusId: number, cardData: CreateCardRequest, position: 'top' | 'bottom' = 'bottom') => {
    try {
      const newCard = await apiService.createCard(projectId, pipelineId, statusId, cardData);
      
      // Сначала обновляем состояние карточек
      setCards(prev => {
        const currentCards = [...(prev[statusId] || [])];
        
        if (position === 'top') {
          // Добавляем карточку в начало с sort_order = 0
          const updatedCard = { ...newCard, sort_order: 0 };
          const updatedCards = currentCards.map((card, index) => ({ ...card, sort_order: index + 1 }));
          
          return {
            ...prev,
            [statusId]: [updatedCard, ...updatedCards]
          };
        } else {
          // Добавляем карточку в конец
          const updatedCard = { ...newCard, sort_order: currentCards.length };
          
          return {
            ...prev,
            [statusId]: [...currentCards, updatedCard]
          };
        }
      });
      
      // Затем обновляем сортировку на сервере, используя setTimeout для получения актуального состояния
      setTimeout(async () => {
        try {
          setCards(currentCards => {
            const statusCards = currentCards[statusId] || [];
            if (statusCards.length > 0) {
              const cardsToUpdate = statusCards.map((card, index) => ({
                id: card.id,
                sort_order: index
              }));
              
              const bulkRequest: BulkCardSortRequest = { cards: cardsToUpdate };
              
              apiService.bulkUpdateCardSort(projectId, bulkRequest)
                .then(() => {
                })
                .catch((error) => {
                  console.error('❌ Error updating sort order:', error);
                });
            }
            return currentCards;
          });
        } catch (error) {
          console.error('❌ Error in delayed sort update:', error);
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ Error creating card:', error);
      throw error;
    }
  }, [projectId, pipelineId]);

  // Обновление карточки
  const handleUpdateCard = useCallback(async (cardId: number, cardData: { title?: string; description?: string }) => {
    try {
      const updatedCard = await apiService.updateCard(projectId, cardId, cardData);
      
      setCards(prev => {
        const newCards = { ...prev };
        Object.keys(newCards).forEach(statusId => {
          const statusIdNum = parseInt(statusId);
          newCards[statusIdNum] = newCards[statusIdNum].map(card => 
            card.id === cardId ? updatedCard : card
          );
        });
        return newCards;
      });
      
    } catch (error) {
      console.error('❌ Error updating card:', error);
      throw error;
    }
  }, [projectId]);

  // Обновление статуса
  const handleUpdateStatus = useCallback(async (statusId: number, data: { name?: string; color?: string }) => {
    try {
      const updatedStatus = await apiService.updateStatus(projectId, pipelineId, statusId, data);
      
      setStatuses(prev => 
        prev.map(status => 
          status.id === statusId 
            ? { ...status, ...updatedStatus }
            : status
        )
      );
      
    } catch (error) {
      console.error('❌ Error updating status:', error);
      throw error;
    }
  }, [projectId, pipelineId]);

  // Создание статуса
  const handleCreateStatus = useCallback(async (name: string) => {
    try {
      // Находим максимальный sort_order среди существующих статусов
      const maxSortOrder = statuses.length > 0 
        ? Math.max(...statuses.map(s => s.sort_order)) 
        : 0;
      
      const newStatus = await apiService.createStatus(projectId, pipelineId, {
        name,
        color: '#3B82F6', // Синий цвет по умолчанию
        sort_order: maxSortOrder + 1 // Добавляем в конец
      });
      
      setStatuses(prev => [...prev, newStatus].sort((a, b) => a.sort_order - b.sort_order));
      setCards(prev => ({
        ...prev,
        [newStatus.id]: []
      }));
      
    } catch (error) {
      console.error('❌ Error creating status:', error);
      throw error;
    }
  }, [projectId, pipelineId, statuses]);

  const handleCreateCardClick = useCallback((statusId: number, position: 'top' | 'bottom') => {
    setCreateCardStatusId(statusId);
    setCreateCardPosition(position);
    setSelectedCard(null);
    setIsCardModalOpen(true);
  }, []);

  const handleCardClick = useCallback((card: CardResponse) => {
    setSelectedCard(card);
    setCreateCardStatusId(null);
    setIsCardModalOpen(true);
  }, []);

  // Удаление карточки
  const handleDeleteCard = useCallback(async (statusId: number, cardId: number) => {
    try {
      await apiService.deleteCard(projectId, cardId);
      
      setCards(prev => ({
        ...prev,
        [statusId]: prev[statusId].filter(card => card.id !== cardId)
      }));
      
    } catch (error) {
      console.error('❌ Error deleting card:', error);
      throw error;
    }
  }, [projectId]);

  // Перемещение карточки с немедленным API вызовом
  const moveCardInUI = useCallback(async (cardId: number, fromStatusId: number, toStatusId: number, toIndex: number) => {
    
    // Сначала обновляем UI
    setCards(prev => {
      
      const newCards = { ...prev };
      
      // Находим карточку в исходном статусе
      const sourceCards = [...(newCards[fromStatusId] || [])];
      const cardIndex = sourceCards.findIndex(card => card.id === cardId);
      
      if (cardIndex === -1) {
        console.error('❌ Card not found:', cardId, 'in status:', fromStatusId);
        return prev;
      }
      
      const [movedCard] = sourceCards.splice(cardIndex, 1);
      
      // Если перемещаем в тот же статус
      if (fromStatusId === toStatusId) {
        sourceCards.splice(toIndex, 0, movedCard);
        newCards[fromStatusId] = sourceCards;
      } else {
        // Перемещаем в другой статус
        const targetCards = [...(newCards[toStatusId] || [])];
        targetCards.splice(toIndex, 0, { ...movedCard, status_id: toStatusId });
        
        newCards[fromStatusId] = sourceCards;
        newCards[toStatusId] = targetCards;
        
      }
      
      return newCards;
    });

    // Если перемещение между разными статусами - сразу вызываем moveCard API
    if (fromStatusId !== toStatusId) {
      try {
        await apiService.moveCard(projectId, cardId, {
          status_id: toStatusId,
          sort_order: toIndex,
        });
      } catch (error) {
        console.error('❌ Error calling moveCard API:', error);
        // В случае ошибки перезагружаем данные
        loadData();
      }
    }
  }, [projectId, loadData]);

  // Сохранение сортировки в API (только для финального drop)
  const saveChangesToAPI = useCallback(async (cardId: number, fromStatusId: number, toStatusId: number) => {
    try {
      
      // Собираем все карточки для обновления сортировки из всех затронутых статусов
      const statusesToUpdate = fromStatusId === toStatusId ? [fromStatusId] : [fromStatusId, toStatusId];
      const allCardsToUpdate: { id: number; sort_order: number }[] = [];
      
      for (const statusId of statusesToUpdate) {
        const statusCards = cards[statusId] || [];
        if (statusCards && statusCards.length > 0) {
          const statusCardsToUpdate = statusCards.map((card, index) => ({
            id: card.id,
            sort_order: index
          }));
          allCardsToUpdate.push(...statusCardsToUpdate);
        }
      }
      
      // Отправляем один bulk-sort запрос для всех затронутых карточек
      if (allCardsToUpdate.length > 0) {
        const bulkRequest: BulkCardSortRequest = {
          cards: allCardsToUpdate
        };
        
        await apiService.bulkUpdateCardSort(projectId, bulkRequest);
      } else {
      }
      
    } catch (error) {
      console.error('❌ Error saving changes:', error);
      // В случае ошибки перезагружаем данные
      loadData();
    }
  }, [cards, projectId, loadData]);

  if (isLoading) {
    return (
      <div className="flex-1 bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка канбан доски...</p>
        </div>
      </div>
    );
  }

  if (statuses.length === 0) {
    return (
      <div className="flex-1 bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Нет статусов в этом пайплайне</p>
          <p className="text-gray-500">Создайте статусы для управления карточками</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 ml-2">
      <div className="flex space-x-2 pb-4">
        {statuses
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((status, index) => (
            <StatusColumn
              key={`status-${status.id}`}
              status={status}
              cards={cards[status.id] || []}
              index={index}
              onCreateCard={handleCreateCard}
              onUpdateCard={handleUpdateCard}
              onDeleteCard={handleDeleteCard}
              moveCardInUI={moveCardInUI}
              saveChangesToAPI={saveChangesToAPI}
              onUpdateStatus={handleUpdateStatus}
              onCreateCardClick={handleCreateCardClick}
              onCardClick={handleCardClick}
            />
          ))}
        
        {/* Кнопка создания нового статуса */}
        <CreateStatusButton
          onCreateStatus={handleCreateStatus}
          isLoading={isLoading}
        />
      </div>

      {/* Модальное окно карточки */}
      <CardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        onCreateCard={async (cardData) => {
          if (createCardStatusId) {
            await handleCreateCard(createCardStatusId, cardData, createCardPosition);
            setIsCardModalOpen(false);
          }
        }}
        onUpdate={async (cardId, cardData) => {
          await handleUpdateCard(cardId, cardData);
          setIsCardModalOpen(false);
        }}
        card={createCardStatusId ? null : selectedCard}
        statusId={createCardStatusId || selectedCard?.status_id}
      />
    </div>
  );
};

export default KanbanBoard;