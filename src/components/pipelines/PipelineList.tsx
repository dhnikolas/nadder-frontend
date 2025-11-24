import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useDrag, useDrop } from 'react-dnd';
import { PipelineResponse } from '../../types/api';
import apiService from '../../services/api';

interface PipelineListProps {
  projectId: number;
  pipelines: PipelineResponse[];
  selectedPipeline: PipelineResponse | null;
  onPipelineSelect: (pipeline: PipelineResponse) => void;
  onPipelineUpdate: () => Promise<void>;
  onStatusesUpdate?: () => void;
}

interface DraggablePipelineProps {
  pipeline: PipelineResponse;
  index: number;
  isSelected: boolean;
  onSelect: (pipeline: PipelineResponse) => void;
  onDelete: (id: number) => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onDropComplete: () => void;
}

const ITEM_TYPE = 'pipeline';

const DraggablePipeline: React.FC<DraggablePipelineProps> = ({
  pipeline,
  index,
  isSelected,
  onSelect,
  onDelete,
  onMove,
  onDropComplete,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop({
    accept: ITEM_TYPE,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: any, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed 40% of the items height
      // This makes it responsive but not too sensitive

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY * 0.4) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY * 1.6) {
        return;
      }

      // Time to actually perform the action
      onMove(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: () => {
      return { id: pipeline.id, index };
    },
    end: (item, monitor) => {
      onDropComplete();
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0.4 : 1;
  drag(drop(ref));

  return (
    <div
      ref={ref}
      style={{ opacity }}
      data-handler-id={handlerId}
      className={`p-3 border rounded-md cursor-pointer transition-all ${
        isSelected
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onSelect(pipeline)}
    >
      <div className="flex items-center space-x-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {pipeline.name}
          </h4>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(pipeline.id);
            }}
            className="p-1 text-red-400 hover:text-red-600 rounded"
            title="Удалить"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const PipelineList: React.FC<PipelineListProps> = ({
  projectId,
  pipelines,
  selectedPipeline,
  onPipelineSelect,
  onPipelineUpdate,
  onStatusesUpdate,
}) => {
  const [pipelineName, setPipelineName] = useState('');
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [localPipelines, setLocalPipelines] = useState<PipelineResponse[]>([]);
  const [pendingOrder, setPendingOrder] = useState<PipelineResponse[] | null>(null);

  // Синхронизируем локальное состояние с props
  React.useEffect(() => {
    setLocalPipelines(pipelines);
  }, [pipelines]);

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pipelineName.trim()) return;

    setIsLoading(true);
    try {
      const newPipeline = await apiService.createPipeline(projectId, {
        name: pipelineName.trim(),
        color: '#3B82F6', // Цвет по умолчанию
        sort_order: localPipelines.length + 1, // Начинаем с 1, а не с 0
      });
      
      // Обновляем список pipelines
      await onPipelineUpdate();
      
      // Автоматически выбираем новый pipeline
      onPipelineSelect(newPipeline);
      setPipelineName('');
      setIsInputVisible(false);
    } catch (error) {
      console.error('Ошибка создания pipeline:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPipelineName('');
    setIsInputVisible(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleDeletePipeline = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот pipeline?')) return;

    try {
      await apiService.deletePipeline(projectId, id);
      
      // Обновляем список pipelines
      await onPipelineUpdate();
      
      // Если удаляемый pipeline был выбран, выбираем другой
      if (selectedPipeline?.id === id) {
        const remainingPipelines = localPipelines.filter(p => p.id !== id);
        if (remainingPipelines.length > 0) {
          onPipelineSelect(remainingPipelines[0]);
        } else {
          onPipelineSelect(null as any);
        }
      }
    } catch (error) {
      console.error('Ошибка удаления pipeline:', error);
    }
  };

  const handleMovePipeline = (dragIndex: number, hoverIndex: number) => {
    
    // Только визуальное перемещение - обновляем локальное состояние
    const newPipelines = [...localPipelines];
    const draggedPipeline = newPipelines[dragIndex];
    
    
    // Удаляем элемент из старой позиции
    newPipelines.splice(dragIndex, 1);
    // Вставляем элемент в новую позицию
    newPipelines.splice(hoverIndex, 0, draggedPipeline);
    
    
    // Мгновенно обновляем локальное состояние для визуального отображения
    setLocalPipelines(newPipelines);
    
    // Сохраняем новый порядок для последующего сохранения при отпускании
    setPendingOrder(newPipelines);
  };

  const handleDropComplete = async () => {
    
    if (!pendingOrder || isUpdatingOrder) {
      setPendingOrder(null);
      return;
    }
    
    setIsUpdatingOrder(true);
    try {
      
      // Подготавливаем данные для массового обновления
      const pipelinesToUpdate = pendingOrder.map((pipeline, index) => ({
        id: pipeline.id,
        sort_order: index + 1 // Начинаем с 1, а не с 0
      }));
      
      
      // Используем новый API для массового обновления
      await apiService.bulkUpdatePipelineSort(projectId, pipelinesToUpdate);
      
      
      // Обновляем список пайплайнов с сервера для синхронизации
      await onPipelineUpdate();
      
    } catch (error) {
      console.error('❌ Ошибка сохранения порядка пайплайнов:', error);
      // В случае ошибки восстанавливаем исходное состояние
      setLocalPipelines(pipelines);
    } finally {
      setIsUpdatingOrder(false);
      setPendingOrder(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-64 flex flex-col overflow-visible relative z-10">
      <div className="flex items-center justify-between mb-4 relative">
        <h3 className="text-lg font-medium text-gray-900">Pipeline</h3>
        <div className="relative">
          <button
            onClick={() => setIsInputVisible(true)}
            disabled={isLoading || isInputVisible}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Добавить pipeline"
          >
            <Plus className="h-4 w-4" />
          </button>

          {/* Форма создания pipeline - выпадающее меню рядом с плюсом */}
          {isInputVisible && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-20">
              <form onSubmit={handleCreatePipeline} className="p-4 space-y-3">
                <div>
                  <label htmlFor="pipelineName" className="block text-sm font-medium text-gray-700 mb-1">
                    Название pipeline
                  </label>
                  <input
                    id="pipelineName"
                    type="text"
                    value={pipelineName}
                    onChange={(e) => setPipelineName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Введите название pipeline"
                    autoFocus
                    disabled={isLoading}
                  />
                </div>
                
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={!pipelineName.trim() || isLoading}
                    className="flex-1 px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Создание...' : 'Создать'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="px-3 py-2 text-gray-600 text-sm font-medium rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Список pipeline */}
      <div className="space-y-2">
        {localPipelines.map((pipeline, index) => (
          <DraggablePipeline
            key={pipeline.id}
            pipeline={pipeline}
            index={index}
            isSelected={selectedPipeline?.id === pipeline.id}
            onSelect={(pipeline) => {
              onPipelineSelect(pipeline);
            }}
            onDelete={handleDeletePipeline}
            onMove={handleMovePipeline}
            onDropComplete={handleDropComplete}
          />
        ))}
      </div>
    </div>
  );
};

export default PipelineList;
