import React, { useState } from 'react';
import { Plus, Trash2, Settings } from 'lucide-react';
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

  const handleCreatePipeline = async (pipelineData: CreatePipelineRequest) => {
    setIsLoading(true);
    try {
      const newPipeline = await apiService.createPipeline(projectId, {
        ...pipelineData,
        sort_order: pipelines.length,
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
        const remainingPipelines = pipelines.filter(p => p.id !== id);
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

  return (
    <div className="bg-white rounded-lg shadow p-4 w-64">
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
        {pipelines.map((pipeline, index) => (
          <div
            key={pipeline.id}
            className={`p-3 border rounded-md cursor-pointer transition-all ${
              selectedPipeline?.id === pipeline.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => {
              console.log('🖱️ Клик по pipeline:', { id: pipeline.id, name: pipeline.name });
              onPipelineSelect(pipeline);
            }}
          >
            <div className="flex items-center space-x-3">
              
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: pipeline.color }}
              />
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {pipeline.name}
                </h4>
              </div>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('🔧 PipelineList: Открываем настройки pipeline');
                    onSettingsOpen(true);
                    openSettings();
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="Настройки"
                >
                  <Settings className="h-4 w-4" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePipeline(pipeline.id);
                  }}
                  className="p-1 text-red-400 hover:text-red-600 rounded"
                  title="Удалить"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
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
