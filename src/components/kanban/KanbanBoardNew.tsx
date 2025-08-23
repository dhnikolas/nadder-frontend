import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PipelineResponse, StatusResponse, CardResponse, CreateCardRequest } from '../../types/api';
import apiService from '../../services/api';
import StatusColumn from './StatusColumn';

interface KanbanBoardProps {
  projectId: number;
  selectedPipeline: PipelineResponse;
  isPipelineSettingsOpen?: boolean;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  projectId, 
  selectedPipeline, 
  isPipelineSettingsOpen = false 
}) => {
  const [statuses, setStatuses] = useState<StatusResponse[]>([]);
  const [cards, setCards] = useState<{ [statusId: number]: CardResponse[] }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Кэш для предотвращения повторных запросов
  const lastLoadedRef = useRef<{ projectId: number; pipelineId: number } | null>(null);

  useEffect(() => {
    if (!selectedPipeline) return;

    // Не загружаем данные при открытии/закрытии настроек pipeline
    if (isPipelineSettingsOpen) {
      return;
    }

    // Проверяем, не загружали ли мы уже эти данные
    if (
      lastLoadedRef.current &&
      lastLoadedRef.current.projectId === projectId &&
      lastLoadedRef.current.pipelineId === selectedPipeline.id
    ) {
      console.log('🔄 Данные уже загружены для этого проекта и pipeline, пропускаем...');
      return;
    }

    const loadStatusesAndCards = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('🔄 Загружаем статусы и карточки для pipeline:', selectedPipeline.name);
        
        // Загружаем статусы и карточки параллельно
        const [statusesResponse, cardsResponse] = await Promise.all([
          apiService.getStatuses(projectId, selectedPipeline.id),
          apiService.getPipelineCards(projectId, selectedPipeline.id),
        ]);

        // Проверяем, что API вернул массивы
        if (!Array.isArray(statusesResponse)) {
          console.error('❌ API вернул не массив статусов:', statusesResponse);
          setStatuses([]);
        } else {
          setStatuses(statusesResponse);
        }

        if (!Array.isArray(cardsResponse.cards)) {
          console.error('❌ API вернул не массив карточек:', cardsResponse);
          setCards({});
        } else {
          // Группируем карточки по статусам
          const groupedCards: { [statusId: number]: CardResponse[] } = {};
          cardsResponse.cards.forEach(card => {
            if (!groupedCards[card.status_id]) {
              groupedCards[card.status_id] = [];
            }
            groupedCards[card.status_id].push(card);
          });

          // Сортируем карточки по sort_order и нормализуем индексы
          Object.keys(groupedCards).forEach(statusId => {
            const statusCards = groupedCards[parseInt(statusId)];
            
            // Сначала сортируем по существующему sort_order
            statusCards.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            
            // Затем нормализуем sort_order, чтобы не было дублирующихся значений
            statusCards.forEach((card, index) => {
              card.sort_order = index;
            });
            
            groupedCards[parseInt(statusId)] = statusCards;
          });

          setCards(groupedCards);
        }

        // Обновляем кэш
        lastLoadedRef.current = { projectId, pipelineId: selectedPipeline.id };
        console.log('✅ Статусы и карточки успешно загружены');
        
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        // При ошибке устанавливаем пустые массивы
        setStatuses([]);
        setCards({});
        setError('Ошибка загрузки данных');
      } finally {
        setIsLoading(false);
      }
    };

    loadStatusesAndCards();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, selectedPipeline?.id, isPipelineSettingsOpen]);

  const handleCreateCard = useCallback(async (statusId: number, cardData: CreateCardRequest) => {
    if (!selectedPipeline) return;

    try {
      // Получаем текущие карточки в статусе
      const currentCards = cards[statusId] || [];
      
      // Определяем следующий sort_order
      const nextSortOrder = currentCards.length;
      
      const newCard = await apiService.createCard(projectId, selectedPipeline.id, statusId, {
        ...cardData,
        sort_order: nextSortOrder,
      });
      
      // Обновляем локальное состояние
      setCards(prevCards => {
        const updatedCards = { ...prevCards };
        if (!updatedCards[statusId]) {
          updatedCards[statusId] = [];
        }
        
        // Добавляем новую карточку с корректным sort_order
        updatedCards[statusId] = [
          ...updatedCards[statusId],
          { ...newCard, sort_order: nextSortOrder }
        ];
        
        return updatedCards;
      });
      
      console.log('✅ Новая карточка создана с sort_order:', nextSortOrder);
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

  const handleMoveCard = useCallback(async (dragIndex: number, hoverIndex: number, fromStatusId: number, toStatusId: number) => {
    console.log('🃏 Moving card:', { dragIndex, hoverIndex, fromStatusId, toStatusId });

    setCards(prevCards => {
      const newCards = { ...prevCards };
      
      if (fromStatusId === toStatusId) {
        // Moving within the same status
        const statusCards = [...newCards[fromStatusId]];
        const [draggedCard] = statusCards.splice(dragIndex, 1);
        statusCards.splice(hoverIndex, 0, draggedCard);
        
        // Update sort_order
        const updatedCards = statusCards.map((card, index) => ({
          ...card,
          sort_order: index,
        }));
        
        newCards[fromStatusId] = updatedCards;
        
        // Call API to update sort order
        apiService.bulkUpdateCardSort(projectId, {
          cards: updatedCards.map((card, index) => ({
            id: card.id,
            sort_order: index,
          })),
        }).catch(error => {
          console.error('Error updating card sort order:', error);
        });
        
      } else {
        // Moving between statuses
        const sourceCards = [...newCards[fromStatusId]];
        const targetCards = [...newCards[toStatusId] || []];
        
        const [draggedCard] = sourceCards.splice(dragIndex, 1);
        draggedCard.status_id = toStatusId;
        
        targetCards.splice(hoverIndex, 0, draggedCard);
        
        // Update sort_order for both statuses
        const updatedSourceCards = sourceCards.map((card, index) => ({
          ...card,
          sort_order: index,
        }));
        
        const updatedTargetCards = targetCards.map((card, index) => ({
          ...card,
          sort_order: index,
        }));
        
        newCards[fromStatusId] = updatedSourceCards;
        newCards[toStatusId] = updatedTargetCards;
        
        // Call API to move card and update sort orders
        Promise.all([
          apiService.moveCard(projectId, draggedCard.id, {
            status_id: toStatusId,
            sort_order: hoverIndex,
          }),
          apiService.bulkUpdateCardSort(projectId, {
            cards: updatedTargetCards.map((card, index) => ({
              id: card.id,
              sort_order: index,
            })),
          }),
          updatedSourceCards.length > 0 ? apiService.bulkUpdateCardSort(projectId, {
            cards: updatedSourceCards.map((card, index) => ({
              id: card.id,
              sort_order: index,
            })),
          }) : Promise.resolve(),
        ]).catch(error => {
          console.error('Error moving card:', error);
        });
      }
      
      return newCards;
    });
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="flex-1 bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="mb-2">Ошибка загрузки данных</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!statuses.length) {
    return (
      <div className="flex-1 bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>Нет статусов для отображения</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 p-2">
      <div className="flex space-x-3 overflow-x-auto w-full">
        {statuses.map((status, index) => (
          <StatusColumn
            key={`status-${status.id}`}
            status={status}
            cards={cards[status.id] || []}
            index={index}
            onCreateCard={handleCreateCard}
            onUpdateCard={handleUpdateCard}
            onDeleteCard={handleDeleteCard}
            onMoveCard={handleMoveCard}
            isDragEnabled={!isPipelineSettingsOpen}
          />
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard;
