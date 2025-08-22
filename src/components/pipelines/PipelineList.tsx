import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Settings } from 'lucide-react';

import { PipelineResponse, CreatePipelineRequest } from '../../types/api';
import apiService from '../../services/api';
import CreatePipelineModal from './CreatePipelineModal';
import PipelineSettingsModal from './PipelineSettingsModal';
import { getSelectedPipeline } from '../../utils/storage';


interface PipelineListProps {
  projectId: number;
  selectedPipeline: PipelineResponse | null;
  onPipelineSelect: (pipeline: PipelineResponse) => void;
  onSettingsOpen: (isOpen: boolean) => void;
}

const PipelineList: React.FC<PipelineListProps> = ({
  projectId,
  selectedPipeline,
  onPipelineSelect,
  onSettingsOpen,
}) => {
  const [pipelines, setPipelines] = useState<PipelineResponse[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadPipelines = async () => {
      try {
        const data = await apiService.getPipelines(projectId);
        const sortedPipelines = data.sort((a, b) => a.sort_order - b.sort_order);
        setPipelines(sortedPipelines);
        
        if (sortedPipelines.length > 0) {
          // Пытаемся загрузить сохраненный pipeline для текущего проекта
          const storedPipeline = getSelectedPipeline();
          let pipelineToSelect: PipelineResponse | null = null;
          
          if (storedPipeline && storedPipeline.projectId === projectId) {
            // Ищем сохраненный pipeline в списке
            const foundPipeline = sortedPipelines.find(p => p.id === storedPipeline.id);
            if (foundPipeline) {
              console.log('📋 Восстанавливаем сохраненный pipeline:', foundPipeline.name);
              pipelineToSelect = foundPipeline;
            } else {
              console.log('⚠️ Сохраненный pipeline не найден в списке');
            }
          } else if (storedPipeline) {
            console.log('⚠️ Сохраненный pipeline принадлежит другому проекту:', {
              storedProjectId: storedPipeline.projectId,
              currentProjectId: projectId
            });
          } else {
            console.log('ℹ️ Сохраненный pipeline не найден');
          }
          
          // Если не удалось восстановить сохраненный pipeline, выбираем первый
          if (!pipelineToSelect) {
            console.log('🔄 Выбираем первый доступный pipeline:', sortedPipelines[0].name);
            pipelineToSelect = sortedPipelines[0];
          }
          
          // Выбираем pipeline только если он отличается от текущего
          if (!selectedPipeline || selectedPipeline.id !== pipelineToSelect.id) {
            console.log('🔄 Автоматически выбираем pipeline:', { 
              id: pipelineToSelect.id, 
              name: pipelineToSelect.name,
              reason: !selectedPipeline ? 'нет выбранного' : 'отличается от текущего'
            });
            onPipelineSelect(pipelineToSelect);
          } else {
            console.log('ℹ️ Pipeline уже выбран:', { 
              id: selectedPipeline.id, 
              name: selectedPipeline.name 
            });
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки pipeline:', error);
      }
    };

    if (projectId) {
      loadPipelines();
    }
  }, [projectId, onPipelineSelect, selectedPipeline]);

  const handleCreatePipeline = async (pipelineData: CreatePipelineRequest) => {
    setIsLoading(true);
    try {
      const newPipeline = await apiService.createPipeline(projectId, {
        ...pipelineData,
        sort_order: pipelines.length,
      });
      const updatedPipelines = [...pipelines, newPipeline];
      setPipelines(updatedPipelines);
      
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
      const updatedPipelines = pipelines.filter(p => p.id !== id);
      setPipelines(updatedPipelines);
      
      // Если удаляемый pipeline был выбран, выбираем другой
      if (selectedPipeline?.id === id) {
        if (updatedPipelines.length > 0) {
          console.log('🗑️ Выбираем новый pipeline после удаления:', { id: updatedPipelines[0].id, name: updatedPipelines[0].name });
          onPipelineSelect(updatedPipelines[0]);
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
              
              <div className="flex space-x-1">
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
                    <Settings className="h-3 w-3" />
                  </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePipeline(pipeline.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  title="Удалить"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pipelines.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Pipeline не найдены</p>
          <p className="text-sm">Создайте первый pipeline для начала работы</p>
        </div>
      )}

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
        />
    </div>
  );
};

export default PipelineList;
