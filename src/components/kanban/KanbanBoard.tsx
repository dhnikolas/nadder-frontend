import React, { useState, useEffect, useCallback } from 'react';
import { StatusResponse, CardResponse, CreateCardRequest, BulkCardSortRequest } from '../../types/api';
import { apiService } from '../../services/api';
import StatusColumn from './StatusColumn';

interface KanbanBoardProps {
  pipelineId: number;
  projectId: number;
}

interface CardsData {
  [statusId: number]: CardResponse[];
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ pipelineId, projectId }) => {
  const [statuses, setStatuses] = useState<StatusResponse[]>([]);
  const [cards, setCards] = useState<CardsData>({});
  const [isLoading, setIsLoading] = useState(true);

  // Загрузка статусов и карточек
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Загружаем статусы и карточки параллельно
      const [statusesResponse, pipelineCardsResponse] = await Promise.all([
        apiService.getStatuses(projectId, pipelineId),
        apiService.getPipelineCards(projectId, pipelineId)
      ]);
      
      setStatuses(statusesResponse);
      
      // Группируем карточки по статусам
      const groupedCards: CardsData = {};
      
      // Инициализируем пустые массивы для всех статусов
      statusesResponse.forEach(status => {
        groupedCards[status.id] = [];
      });
      
      // Распределяем карточки по статусам и сортируем
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
      
      setCards(groupedCards);
      console.log('📊 Optimized data loading completed:');
      console.log('  📋 Statuses loaded:', statusesResponse.length);
      console.log('  🃏 Total cards loaded:', pipelineCardsResponse.cards.length);
      console.log('  📊 Cards grouped by status:', Object.keys(groupedCards).reduce((acc, statusId) => {
        acc[statusId] = groupedCards[parseInt(statusId)].length;
        return acc;
      }, {} as Record<string, number>));
    } catch (error) {
      console.error('❌ Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pipelineId, projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Создание карточки
  const handleCreateCard = useCallback(async (statusId: number, cardData: CreateCardRequest) => {
    try {
      const newCard = await apiService.createCard(projectId, pipelineId, statusId, cardData);
      
      setCards(prev => ({
        ...prev,
        [statusId]: [...(prev[statusId] || []), newCard].sort((a, b) => a.sort_order - b.sort_order)
      }));
      
      console.log('✅ Card created:', newCard);
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
      
      // Только обновляем сортировку во всех затронутых статусах
      // moveCard уже был вызван в moveCardInUI для перемещений между статусами
      const statusesToUpdate = fromStatusId === toStatusId ? [fromStatusId] : [fromStatusId, toStatusId];
      console.log('🔄 Updating sort order for statuses:', statusesToUpdate);
      
      for (const statusId of statusesToUpdate) {
        const statusCards = cards[statusId] || [];
        if (statusCards.length > 0) {
          const cardsToUpdate: BulkCardSortRequest = {
            cards: statusCards.map((card, index) => ({
              id: card.id,
              sort_order: index
            }))
          };
          
          console.log(`🔄 Updating sort order for status ${statusId}:`, cardsToUpdate);
          await apiService.bulkUpdateCardSort(projectId, cardsToUpdate);
          console.log(`✅ Sort order updated for status ${statusId}`);
        }
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
    <div className="flex-1 bg-gray-50 p-6 overflow-x-auto">
      <div className="flex space-x-6 min-w-max">
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
            />
          ))}
      </div>
    </div>
  );
};

export default KanbanBoard;