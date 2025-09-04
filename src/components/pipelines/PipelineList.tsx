import React, { useState } from 'react';
import { Plus, Trash2, Settings } from 'lucide-react';
import { useDrag, useDrop } from 'react-dnd';
import { PipelineResponse, CreatePipelineRequest } from '../../types/api';
import apiService from '../../services/api';
import CreatePipelineModal from './CreatePipelineModal';
import PipelineSettingsModal from './PipelineSettingsModal';

interface PipelineListProps {
  projectId: number;
  pipelines: PipelineResponse[];
  selectedPipeline: PipelineResponse | null;
  onPipelineSelect: (pipeline: PipelineResponse) => void;
  onSettingsOpen: (isOpen: boolean) => void;
  onPipelineUpdate: () => Promise<void>;
  onStatusesUpdate?: () => void;
}

interface DraggablePipelineProps {
  pipeline: PipelineResponse;
  index: number;
  isSelected: boolean;
  onSelect: (pipeline: PipelineResponse) => void;
  onDelete: (id: number) => void;
  onSettingsOpen: () => void;
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
  onSettingsOpen,
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
      console.log('🎯 Вызываем onMove:', { dragIndex, hoverIndex });
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
      console.log('🎯 Начинаем перетаскивание пайплайна:', { id: pipeline.id, name: pipeline.name, index });
      return { id: pipeline.id, index };
    },
    end: (item, monitor) => {
      console.log('🏁 Завершение перетаскивания пайплайна:', { id: pipeline.id, name: pipeline.name });
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
              onSettingsOpen();
            }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Настройки"
          >
            <Settings className="h-4 w-4" />
          </button>
          
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
  onSettingsOpen,
  onPipelineUpdate,
  onStatusesUpdate,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [localPipelines, setLocalPipelines] = useState<PipelineResponse[]>([]);
  const [pendingOrder, setPendingOrder] = useState<PipelineResponse[] | null>(null);

  // Синхронизируем локальное состояние с props
  React.useEffect(() => {
    setLocalPipelines(pipelines);
  }, [pipelines]);

  const handleCreatePipeline = async (pipelineData: CreatePipelineRequest) => {
    setIsLoading(true);
    try {
      const newPipeline = await apiService.createPipeline(projectId, {
        ...pipelineData,
        sort_order: localPipelines.length + 1, // Начинаем с 1, а не с 0
      });
      
      // Обновляем список pipelines
      console.log('🔄 Обновляем список pipelines после создания');
      await onPipelineUpdate();
      
      // Автоматически выбираем новый pipeline
      console.log('🆕 Автоматически выбираем новый pipeline:', { id: newPipeline.id, name: newPipeline.name });
      onPipelineSelect(newPipeline);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Ошибка создания pipeline:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePipeline = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот pipeline?')) return;

    try {
      await apiService.deletePipeline(projectId, id);
      
      // Обновляем список pipelines
      console.log('🔄 Обновляем список pipelines после удаления');
      await onPipelineUpdate();
      
      // Если удаляемый pipeline был выбран, выбираем другой
      if (selectedPipeline?.id === id) {
        const remainingPipelines = localPipelines.filter(p => p.id !== id);
        if (remainingPipelines.length > 0) {
          console.log('🗑️ Выбираем новый pipeline после удаления:', { id: remainingPipelines[0].id, name: remainingPipelines[0].name });
          onPipelineSelect(remainingPipelines[0]);
        } else {
          console.log('🗑️ Нет доступных pipeline после удаления');
          onPipelineSelect(null as any);
        }
      }
    } catch (error) {
      console.error('Ошибка удаления pipeline:', error);
    }
  };

  const openSettings = () => {
    setIsSettingsModalOpen(true);
  };

  const handleMovePipeline = (dragIndex: number, hoverIndex: number) => {
    console.log('🔄 handleMovePipeline вызвана (только визуально):', { dragIndex, hoverIndex });
    
    // Только визуальное перемещение - обновляем локальное состояние
    const newPipelines = [...localPipelines];
    const draggedPipeline = newPipelines[dragIndex];
    
    console.log('🎯 Перетаскиваемый пайплайн:', { id: draggedPipeline.id, name: draggedPipeline.name });
    
    // Удаляем элемент из старой позиции
    newPipelines.splice(dragIndex, 1);
    // Вставляем элемент в новую позицию
    newPipelines.splice(hoverIndex, 0, draggedPipeline);
    
    console.log('📋 Новый порядок пайплайнов (визуально):', newPipelines.map((p, i) => ({ id: p.id, name: p.name, new_sort_order: i })));
    
    // Мгновенно обновляем локальное состояние для визуального отображения
    setLocalPipelines(newPipelines);
    
    // Сохраняем новый порядок для последующего сохранения при отпускании
    setPendingOrder(newPipelines);
  };

  const handleDropComplete = async () => {
    console.log('🏁 handleDropComplete вызвана - сохраняем изменения');
    
    if (!pendingOrder || isUpdatingOrder) {
      console.log('⚠️ Нет изменений для сохранения или обновление уже в процессе');
      setPendingOrder(null);
      return;
    }
    
    setIsUpdatingOrder(true);
    try {
      console.log('💾 Сохраняем новый порядок на сервере...');
      
      // Подготавливаем данные для массового обновления
      const pipelinesToUpdate = pendingOrder.map((pipeline, index) => ({
        id: pipeline.id,
        sort_order: index + 1 // Начинаем с 1, а не с 0
      }));
      
      console.log('📋 Данные для массового обновления:', pipelinesToUpdate);
      
      // Используем новый API для массового обновления
      await apiService.bulkUpdatePipelineSort(projectId, pipelinesToUpdate);
      
      console.log('✅ Массовое обновление завершено успешно');
      
      // Обновляем список пайплайнов с сервера для синхронизации
      await onPipelineUpdate();
      
      console.log('✅ Порядок пайплайнов сохранен успешно');
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Pipeline</h3>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
          title="Добавить pipeline"
        >
          <Plus className="h-4 w-4" />
        </button>
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
              console.log('🖱️ Клик по pipeline:', { id: pipeline.id, name: pipeline.name });
              onPipelineSelect(pipeline);
            }}
            onDelete={handleDeletePipeline}
            onSettingsOpen={() => {
              console.log('🔧 PipelineList: Открываем настройки pipeline');
              onSettingsOpen(true);
              openSettings();
            }}
            onMove={handleMovePipeline}
            onDropComplete={handleDropComplete}
          />
        ))}
      </div>

      {/* Модальное окно создания pipeline */}
              <CreatePipelineModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreatePipeline={handleCreatePipeline}
          isLoading={isLoading}
        />

      {/* Модальное окно настроек pipeline */}
      <PipelineSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => {
          console.log('🔧 PipelineList: Закрываем настройки pipeline');
          setIsSettingsModalOpen(false);
          onSettingsOpen(false);
          // Принудительно сбрасываем состояние через небольшую задержку
          setTimeout(() => {
            console.log('🔧 PipelineList: Принудительно сбрасываем состояние');
            onSettingsOpen(false);
          }, 100);
        }}
        pipeline={selectedPipeline}
        projectId={projectId}
        onStatusesUpdate={onStatusesUpdate}
      />
    </div>
  );
};

export default PipelineList;
