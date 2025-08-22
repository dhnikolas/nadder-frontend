import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { PipelineResponse, StatusResponse, CardResponse, CreateCardRequest } from '../../types/api';
import apiService from '../../services/api';
import StatusColumn from './StatusColumn';

interface KanbanBoardProps {
  projectId: number;
  selectedPipeline: PipelineResponse | null;
  isPipelineSettingsOpen?: boolean;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId, selectedPipeline, isPipelineSettingsOpen = false }) => {
  const [statuses, setStatuses] = useState<StatusResponse[]>([]);
  const [cards, setCards] = useState<{ [statusId: number]: CardResponse[] }>({});

  // Логируем изменения состояния drag and drop
  useEffect(() => {
    console.log('🎯 KanbanBoard: isPipelineSettingsOpen =', isPipelineSettingsOpen, 'тип:', typeof isPipelineSettingsOpen);
  }, [isPipelineSettingsOpen]);

  // Используем useRef для предотвращения повторных вызовов
  const isLoadingRef = useRef(false);

  // Кэш для предотвращения повторных запросов
  const lastLoadedRef = useRef<{ projectId: number; pipelineId: number } | null>(null);

  useEffect(() => {
    // Проверяем, нужно ли загружать данные
    if (!projectId || !selectedPipeline) {
      setStatuses([]);
      setCards({});
      isLoadingRef.current = false;
      lastLoadedRef.current = null;
      return;
    }

    // Не загружаем данные при открытии/закрытии настроек pipeline
    if (isPipelineSettingsOpen) {
      return;
    }

    // Проверяем, не загружали ли мы уже эти данные
    if (lastLoadedRef.current?.projectId === projectId && 
        lastLoadedRef.current?.pipelineId === selectedPipeline.id &&
        isLoadingRef.current) {
      return;
    }

    // Проверяем, не загружаем ли мы уже данные
    if (isLoadingRef.current) return;
    
    const loadStatusesAndCards = async () => {
      isLoadingRef.current = true;
      try {
        console.log('📋 Загружаем статусы и карточки для pipeline:', selectedPipeline.name);
        
        // Загружаем статусы
        const statusesData = await apiService.getStatuses(projectId, selectedPipeline.id);
        
        // Проверяем, что API вернул массив
        if (!Array.isArray(statusesData)) {
          console.warn('⚠️ API вернул не массив для статусов:', statusesData);
          setStatuses([]);
          setCards({});
          return;
        }
        
        const sortedStatuses = statusesData.sort((a, b) => a.sort_order - b.sort_order);
        setStatuses(sortedStatuses);
        
        // Загружаем все карточки pipeline одним запросом
        try {
          console.log('🃏 Загружаем все карточки pipeline одним запросом...');
          const pipelineCardsData = await apiService.getPipelineCards(projectId, selectedPipeline.id);
          
          // Группируем карточки по статусам
          const cardsData: { [statusId: number]: CardResponse[] } = {};
          sortedStatuses.forEach(status => {
            const statusCards = pipelineCardsData.cards
              .filter(card => card.status_id === status.id)
              .sort((a, b) => a.sort_order - b.sort_order);
            cardsData[status.id] = statusCards;
          });
          
          console.log('✅ Все карточки загружены одним запросом:', {
            pipeline: pipelineCardsData.pipeline_name,
            totalCards: pipelineCardsData.cards.length,
            statuses: sortedStatuses.length
          });
          setCards(cardsData);
        } catch (error) {
          console.error('❌ Ошибка загрузки карточек pipeline:', error);
          // При ошибке устанавливаем пустые массивы карточек
          const emptyCards: { [statusId: number]: CardResponse[] } = {};
          sortedStatuses.forEach(status => {
            emptyCards[status.id] = [];
          });
          setCards(emptyCards);
        }
        
        // Обновляем кэш
        lastLoadedRef.current = { projectId, pipelineId: selectedPipeline.id };
        
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        // При ошибке устанавливаем пустые массивы
        setStatuses([]);
        setCards({});
      } finally {
        isLoadingRef.current = false;
      }
    };

    loadStatusesAndCards();
  }, [projectId, selectedPipeline?.id, isPipelineSettingsOpen]); // Загружаем при изменении ID проекта, pipeline или состояния настроек

  const handleCreateCard = useCallback(async (statusId: number, cardData: CreateCardRequest) => {
    if (!selectedPipeline) return;

    try {
      const newCard = await apiService.createCard(projectId, selectedPipeline.id, statusId, {
        ...cardData,
        sort_order: (cards[statusId]?.length || 0),
      });
      
      setCards(prevCards => ({
        ...prevCards,
        [statusId]: [...(prevCards[statusId] || []), newCard],
      }));
    } catch (error) {
      console.error('Ошибка создания карточки:', error);
    }
  }, [projectId, selectedPipeline, cards]);

  const handleUpdateCard = useCallback(async (cardId: number, cardData: { title?: string; description?: string }) => {
    try {
      const updatedCard = await apiService.updateCard(projectId, cardId, cardData);
      
      // Обновляем карточку во всех статусах
      setCards(prevCards => {
        const newCards = { ...prevCards };
        Object.keys(newCards).forEach(statusId => {
          newCards[parseInt(statusId)] = newCards[parseInt(statusId)].map(card =>
            card.id === cardId ? updatedCard : card
          );
        });
        return newCards;
      });
    } catch (error) {
      console.error('Ошибка обновления карточки:', error);
    }
  }, [projectId]);

  const handleDeleteCard = useCallback(async (statusId: number, cardId: number) => {
    try {
      await apiService.deleteCard(projectId, cardId);
      setCards(prevCards => ({
        ...prevCards,
        [statusId]: prevCards[statusId].filter(card => card.id !== cardId),
      }));
    } catch (error) {
      console.error('Ошибка удаления карточки:', error);
    }
  }, [projectId]);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Если карточка не была перемещена
    if (!destination) return;

    // Если карточка осталась в том же статусе и на том же месте
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceStatusId = parseInt(source.droppableId);
    const destStatusId = parseInt(destination.droppableId);
    const cardId = parseInt(draggableId);

    console.log('🔄 Drag & Drop:', {
      source: { statusId: sourceStatusId, index: source.index },
      destination: { statusId: destStatusId, index: destination.index },
      cardId,
      isSameStatus: sourceStatusId === destStatusId
    });

    try {
      // Если карточка перемещается в том же статусе
      if (sourceStatusId === destStatusId) {
        // Создаем копию массива карточек для одного статуса
        const statusCards = [...(cards[sourceStatusId] || [])];
        
        // Удаляем карточку с исходной позиции
        const [movedCard] = statusCards.splice(source.index, 1);
        
        // Вставляем карточку в новую позицию
        statusCards.splice(destination.index, 0, movedCard);
        
        // Обновляем sort_order для ВСЕХ карточек в статусе
        const reorderedCards = statusCards.map((card, index) => ({
          ...card,
          sort_order: index,
        }));
        
        // Обновляем локальное состояние с новым порядком
        setCards({
          ...cards,
          [sourceStatusId]: reorderedCards,
        });
        
        // Вызываем move API для обновления порядка
        await apiService.moveCard(projectId, cardId, {
          status_id: sourceStatusId, // Тот же статус
          sort_order: destination.index,
        });
        
        // Массово обновляем sort_order для всех карточек в статусе
        try {
          console.log('🔄 Массово обновляем sort_order для карточек в статусе:', sourceStatusId);
          const cardsToUpdate = reorderedCards.map((card, index) => ({
            id: card.id,
            sort_order: index,
          }));
          
          await apiService.bulkUpdateCardSort(projectId, cardsToUpdate);
          console.log('✅ sort_order массово обновлен для всех карточек:', cardsToUpdate.length);
        } catch (error) {
          console.error('❌ Ошибка массового обновления sort_order карточек:', error);
        }
      } else {
        // Если карточка перемещается в другой статус
        // Обновляем локальное состояние
        const sourceCards = [...(cards[sourceStatusId] || [])];
        const destCards = [...(cards[destStatusId] || [])];
        
        // Удаляем карточку из исходного статуса
        const [movedCard] = sourceCards.splice(source.index, 1);
        
        // Обновляем sort_order для карточек в исходном статусе
        const updatedSourceCards = sourceCards.map((card, index) => ({
          ...card,
          sort_order: index,
        }));
        
        // Вставляем карточку в целевой статус с учетом существующей сортировки
        // Сначала обновляем sort_order для всех существующих карточек в целевом статусе
        const existingDestCards = destCards.map((card, index) => ({
          ...card,
          sort_order: index,
        }));
        
        // Вставляем перемещенную карточку в нужную позицию
        existingDestCards.splice(destination.index, 0, {
          ...movedCard,
          status_id: destStatusId, // Обновляем status_id для карточки
          sort_order: destination.index,
        });
        
        // Обновляем sort_order для всех карточек после вставленной
        const updatedDestCards = existingDestCards.map((card, index) => ({
          ...card,
          sort_order: index,
        }));

        // Обновляем оба статуса
        setCards({
          ...cards,
          [sourceStatusId]: updatedSourceCards,
          [destStatusId]: updatedDestCards,
        });
        
        // Вызываем move API для перемещения между статусами
        await apiService.moveCard(projectId, cardId, {
          status_id: destStatusId,
          sort_order: destination.index,
        });
        
        // Массово обновляем sort_order для всех карточек в целевом статусе
        try {
          console.log('🔄 Массово обновляем sort_order для карточек в целевом статусе:', destStatusId);
          const cardsToUpdate = updatedDestCards.map((card, index) => ({
            id: card.id,
            sort_order: index,
          }));
          
          await apiService.bulkUpdateCardSort(projectId, cardsToUpdate);
          console.log('✅ sort_order массово обновлен для всех карточек в целевом статусе:', cardsToUpdate.length);
        } catch (error) {
          console.error('❌ Ошибка массового обновления sort_order карточек в целевом статусе:', error);
        }
      }
    } catch (error) {
      console.error('Ошибка перемещения карточки:', error);
    }
  }, [projectId, cards]);

  if (!selectedPipeline) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg">Выберите pipeline для отображения Kanban доски</p>
        </div>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={isPipelineSettingsOpen ? () => {} : handleDragEnd}>
      <div className="flex-1 bg-gray-50 p-2">
        <div className="flex space-x-3 overflow-x-auto w-full">
          {statuses.map((status, index) => (
            <StatusColumn
              key={`status-${status.id}-${isPipelineSettingsOpen ? 'no-drag' : 'drag'}`}
              status={status}
              cards={cards[status.id] || []}
              index={index}
              onCreateCard={handleCreateCard}
              onUpdateCard={handleUpdateCard}
              onDeleteCard={handleDeleteCard}
              isDragEnabled={!isPipelineSettingsOpen}
            />
          ))}
        </div>

        {statuses.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Статусы не найдены</p>
            <p className="text-sm">Создайте первый статус для начала работы с Kanban доской</p>
          </div>
        )}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
