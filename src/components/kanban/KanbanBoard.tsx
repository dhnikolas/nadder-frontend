import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StatusResponse, CardResponse, CreateCardRequest, BulkCardSortRequest, MoveCardRequest, UpdateStatusRequest } from '../../types/api';
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
  const handleUpdateStatus = useCallback(async (statusId: number, data: UpdateStatusRequest) => {
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

  // Удаление статуса
  const handleDeleteStatus = useCallback(async (statusId: number) => {
    try {
      await apiService.deleteStatus(projectId, pipelineId, statusId);
      
      // Удаляем статус из списка
      setStatuses(prev => prev.filter(status => status.id !== statusId));
      
      // Удаляем карточки этого статуса
      setCards(prev => {
        const newCards = { ...prev };
        delete newCards[statusId];
        return newCards;
      });
      
      // Перезагружаем данные для обновления sort_order
      await loadData();
      
    } catch (error) {
      console.error('❌ Error deleting status:', error);
      throw error;
    }
  }, [projectId, pipelineId, loadData]);

  // Перемещение статуса
  const handleMoveStatus = useCallback((fromIndex: number, toIndex: number) => {
    setStatuses(prev => {
      // Сортируем по sort_order
      const sorted = [...prev].sort((a, b) => a.sort_order - b.sort_order);
      
      // Если индексы одинаковые, ничего не делаем
      if (fromIndex === toIndex) {
        return prev;
      }
      
      // Удаляем статус из старой позиции
      const [moved] = sorted.splice(fromIndex, 1);
      
      // Вставляем в новую позицию
      sorted.splice(toIndex, 0, moved);
      
      // Обновляем sort_order для всех статусов
      const updated = sorted.map((status, index) => ({
        ...status,
        sort_order: index + 1,
      }));
      
      // Обновляем sort_order на сервере для измененных статусов
      updated.forEach((status, index) => {
        const oldStatus = prev.find(s => s.id === status.id);
        if (oldStatus && oldStatus.sort_order !== index + 1) {
          apiService.updateStatus(projectId, pipelineId, status.id, {
            sort_order: index + 1,
          }).catch(error => {
            console.error('❌ Error updating status sort_order:', error);
          });
        }
      });
      
      return updated;
    });
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

  // Функция для перемещения карточки через модальное окно
  const handleMoveCard = useCallback(async (cardId: number, data: MoveCardRequest) => {
    try {
      await apiService.moveCard(projectId, cardId, data);
      
      // Обновляем UI после успешного перемещения
      setCards(prev => {
        const newCards = { ...prev };
        
        // Находим карточку в исходном статусе
        let movedCard: CardResponse | null = null;
        Object.keys(newCards).forEach(statusId => {
          const statusIdNum = parseInt(statusId);
          const cardIndex = newCards[statusIdNum].findIndex(card => card.id === cardId);
          if (cardIndex !== -1) {
            movedCard = newCards[statusIdNum][cardIndex];
            newCards[statusIdNum].splice(cardIndex, 1);
          }
        });
        
        if (movedCard) {
          // Добавляем карточку в новый статус
          const targetCards = [...(newCards[data.status_id] || [])];
          targetCards.push(Object.assign({}, movedCard, { status_id: data.status_id }) as CardResponse);
          newCards[data.status_id] = targetCards;
        }
        
        return newCards;
      });
      
    } catch (error) {
      console.error('❌ Error moving card:', error);
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
      <div className="flex-1 bg-gray-50 ml-2">
        <div className="flex space-x-2 pb-4 pt-4">
          {/* Кнопка создания первого статуса с автоматически открытой формой */}
          <CreateStatusButton
            onCreateStatus={handleCreateStatus}
            isLoading={isLoading}
            autoOpen={true}
          />
        </div>
      </div>
    );
  }

  const sortedStatuses = [...statuses].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="flex-1 bg-gray-50 ml-2">
      <div className="flex space-x-2 pb-4">
        {sortedStatuses.map((status, index) => {
          const isLastStatus = index === sortedStatuses.length - 1;
          return (
            <StatusColumn
              key={`status-${status.id}`}
              status={status}
              cards={cards[status.id] || []}
              index={index}
              isLastStatus={isLastStatus}
              onCreateCard={handleCreateCard}
              onUpdateCard={handleUpdateCard}
              onDeleteCard={handleDeleteCard}
              moveCardInUI={moveCardInUI}
              saveChangesToAPI={saveChangesToAPI}
              onUpdateStatus={handleUpdateStatus}
              onDeleteStatus={handleDeleteStatus}
              onMoveStatus={handleMoveStatus}
              onCreateCardClick={handleCreateCardClick}
              onCardClick={handleCardClick}
            />
          );
        })}
        
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
            // Не закрываем окно после создания - пользователь может продолжить редактирование
          }
        }}
        onUpdate={async (cardId, cardData) => {
          await handleUpdateCard(cardId, cardData);
          // Не закрываем окно после обновления - пользователь может продолжить редактирование
        }}
        onMoveCard={handleMoveCard}
        card={createCardStatusId ? null : selectedCard}
        statusId={createCardStatusId || selectedCard?.status_id}
        statuses={statuses}
      />
    </div>
  );
};

export default KanbanBoard;