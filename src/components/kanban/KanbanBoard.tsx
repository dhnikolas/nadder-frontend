import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StatusResponse, CardResponse, CreateCardRequest, BulkCardSortRequest } from '../../types/api';
import { apiService } from '../../services/api';
import StatusColumn from './StatusColumn';

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
  console.log('🎯 KanbanBoard component render with:', { projectId, pipelineId });
  
  const [statuses, setStatuses] = useState<StatusResponse[]>([]);
  const [cards, setCards] = useState<CardsData>({});
  const [isLoading, setIsLoading] = useState(true);
  const lastLoadRef = useRef<{ projectId: number; pipelineId: number } | null>(null);
  const loadingRef = useRef<boolean>(false); // Флаг активной загрузки

  // Загрузка статусов и карточек
  const loadData = useCallback(async () => {
    // Проверяем, не загружали ли мы уже данные для этих параметров
    if (lastLoadRef.current?.projectId === projectId && lastLoadRef.current?.pipelineId === pipelineId) {
      console.log('⏭️ Data already loaded for this project/pipeline, skipping');
      return;
    }
    
    // Проверяем, не идет ли уже загрузка
    if (loadingRef.current) {
      console.log('⏳ Loading already in progress, skipping');
      return;
    }
    
    try {
      console.log('🔄 loadData called for:', { projectId, pipelineId });
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
        console.log('📭 No statuses found in pipeline');
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
        console.log('📭 No cards found in pipeline, initializing empty statuses');
      }
      
      setCards(groupedCards);
      console.log('📊 Optimized data loading completed:');
      console.log('  📋 Statuses loaded:', statusesResponse?.length || 0);
      console.log('  🃏 Total cards loaded:', pipelineCardsResponse.cards?.length || 0);
      console.log('  📊 Cards grouped by status:', Object.keys(groupedCards).reduce((acc, statusId) => {
        acc[statusId] = groupedCards[parseInt(statusId)].length;
        return acc;
      }, {} as Record<string, number>));
      
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
    console.log('🔍 useEffect triggered for loadData, projectId:', projectId, 'pipelineId:', pipelineId);
    if (projectId && pipelineId) {
      loadData();
    } else {
      console.log('⏭️ Skipping loadData - missing projectId or pipelineId');
    }
  }, [loadData, projectId, pipelineId]);

  // Автоматическое открытие карточки из поиска
  useEffect(() => {
    if (cardToOpen && !isLoading && Object.keys(cards).length > 0) {
      console.log('🔍 Автоматически открываем карточку:', cardToOpen);
      
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
          console.log('✅ Карточка автоматически открыта:', targetCard.title);
        }
        
        // Уведомляем Dashboard, что карточка открыта
        if (onCardOpened) {
          onCardOpened();
        }
      } else {
        console.log('⚠️ Карточка не найдена для автоматического открытия:', cardToOpen);
      }
    }
  }, [cardToOpen, isLoading, cards, onCardOpened]);

  // Логирование mount/unmount компонента
  useEffect(() => {
    console.log('🚀 KanbanBoard mounted for:', { projectId, pipelineId });
    return () => {
      console.log('💥 KanbanBoard unmounted for:', { projectId, pipelineId });
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
              console.log(`🔄 Updating sort order after creating card at ${position}:`, bulkRequest);
              
              apiService.bulkUpdateCardSort(projectId, bulkRequest)
                .then(() => {
                  console.log(`✅ Sort order updated on server for ${position} creation`);
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
      
      console.log(`✅ Card created at ${position}:`, newCard);
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
      
      console.log('✅ Card updated:', updatedCard);
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
      
      console.log('✅ Status updated:', updatedStatus);
    } catch (error) {
      console.error('❌ Error updating status:', error);
      throw error;
    }
  }, [projectId, pipelineId]);

  // Удаление карточки
  const handleDeleteCard = useCallback(async (statusId: number, cardId: number) => {
    try {
      await apiService.deleteCard(projectId, cardId);
      
      setCards(prev => ({
        ...prev,
        [statusId]: prev[statusId].filter(card => card.id !== cardId)
      }));
      
      console.log('✅ Card deleted:', cardId);
    } catch (error) {
      console.error('❌ Error deleting card:', error);
      throw error;
    }
  }, [projectId]);

  // Перемещение карточки с немедленным API вызовом
  const moveCardInUI = useCallback(async (cardId: number, fromStatusId: number, toStatusId: number, toIndex: number) => {
    console.log('🔄 moveCardInUI called with:', { cardId, fromStatusId, toStatusId, toIndex });
    
    // Сначала обновляем UI
    setCards(prev => {
      console.log('🔄 Current cards state:', prev);
      
      const newCards = { ...prev };
      
      // Находим карточку в исходном статусе
      const sourceCards = [...(newCards[fromStatusId] || [])];
      const cardIndex = sourceCards.findIndex(card => card.id === cardId);
      
      if (cardIndex === -1) {
        console.error('❌ Card not found:', cardId, 'in status:', fromStatusId);
        return prev;
      }
      
      const [movedCard] = sourceCards.splice(cardIndex, 1);
      console.log('🔄 Moved card:', movedCard);
      
      // Если перемещаем в тот же статус
      if (fromStatusId === toStatusId) {
        sourceCards.splice(toIndex, 0, movedCard);
        newCards[fromStatusId] = sourceCards;
        console.log('🔄 Same status move, new order:', sourceCards.map(c => ({ id: c.id, sort_order: c.sort_order })));
      } else {
        // Перемещаем в другой статус
        const targetCards = [...(newCards[toStatusId] || [])];
        targetCards.splice(toIndex, 0, { ...movedCard, status_id: toStatusId });
        
        newCards[fromStatusId] = sourceCards;
        newCards[toStatusId] = targetCards;
        
        console.log('🔄 Cross-status move:');
        console.log('  - Source status:', fromStatusId, 'cards:', sourceCards.map(c => ({ id: c.id, sort_order: c.sort_order })));
        console.log('  - Target status:', toStatusId, 'cards:', targetCards.map(c => ({ id: c.id, sort_order: c.sort_order })));
      }
      
      console.log('🔄 New cards state:', newCards);
      return newCards;
    });

    // Если перемещение между разными статусами - сразу вызываем moveCard API
    if (fromStatusId !== toStatusId) {
      try {
        console.log('🚀 Calling moveCard API immediately for cross-status move');
        await apiService.moveCard(projectId, cardId, {
          status_id: toStatusId,
          sort_order: toIndex,
        });
        console.log('✅ moveCard API call successful');
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
      console.log('💾 saveChangesToAPI called with:', { cardId, fromStatusId, toStatusId });
      console.log('💾 Current cards state:', cards);
      
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
          console.log(`📝 Added ${statusCardsToUpdate.length} cards from status ${statusId} to bulk update`);
        }
      }
      
      // Отправляем один bulk-sort запрос для всех затронутых карточек
      if (allCardsToUpdate.length > 0) {
        const bulkRequest: BulkCardSortRequest = {
          cards: allCardsToUpdate
        };
        
        console.log(`🚀 Sending single bulk-sort request for ${allCardsToUpdate.length} cards:`, bulkRequest);
        await apiService.bulkUpdateCardSort(projectId, bulkRequest);
        console.log(`✅ Bulk sort order updated for ${statusesToUpdate.length} status(es) in one request`);
      } else {
        console.log('📭 No cards to update sort order for');
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
    <div className="flex-1 bg-gray-50">
      <div className="overflow-x-auto h-full">
        <div className="flex space-x-2 min-w-max h-full">
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
              />
            ))}
        </div>
      </div>
    </div>
  );
};

export default KanbanBoard;