import React, { useState, useEffect } from 'react';
import { LogOut, User } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import ProjectSelector from './projects/ProjectSelector';
import PipelineList from './pipelines/PipelineList';
import KanbanBoard from './kanban/KanbanBoard';
import { ProjectResponse, PipelineResponse } from '../types/api';
import { getSelectedProject, getSelectedPipeline, validateStoredData, saveSelectedProject, saveSelectedPipeline, clearSelectedPipeline } from '../utils/storage';
import apiService from '../services/api';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [selectedProject, setSelectedProject] = useState<ProjectResponse | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineResponse | null>(null);
  const [isPipelineSettingsOpen, setIsPipelineSettingsOpen] = useState(false);

  // Логируем изменения состояния настроек pipeline
  useEffect(() => {
    console.log('🔧 Dashboard: Состояние настроек pipeline изменилось:', isPipelineSettingsOpen, 'тип:', typeof isPipelineSettingsOpen);
  }, [isPipelineSettingsOpen]);

  const handleProjectSelect = (project: ProjectResponse) => {
    setSelectedProject(project);
    // Сбрасываем выбранный pipeline при смене проекта
    setSelectedPipeline(null);
    
    // Сохраняем выбранный проект
    saveSelectedProject(project);
    console.log('💾 Сохранен выбранный проект:', project.name);
    
    // Очищаем сохраненный pipeline, так как он принадлежит другому проекту
    clearSelectedPipeline();
    console.log('🧹 Очищен сохраненный pipeline при смене проекта');
  };

  const handlePipelineSelect = (pipeline: PipelineResponse | null) => {
    console.log('🔄 handlePipelineSelect вызван с:', {
      pipeline: pipeline ? { id: pipeline.id, name: pipeline.name, project_id: pipeline.project_id } : null,
      selectedProject: selectedProject ? { id: selectedProject.id, name: selectedProject.name } : null
    });
    
    setSelectedPipeline(pipeline);
    
    // Сохраняем выбранный pipeline, если он есть
    if (pipeline && selectedProject) {
      const pipelineData = {
        id: pipeline.id,
        name: pipeline.name,
        projectId: pipeline.project_id,
      };
      console.log('💾 Сохраняем pipeline данные:', pipelineData);
      saveSelectedPipeline(pipelineData);
      console.log('✅ Pipeline сохранен успешно');
    } else {
      console.log('⚠️ Pipeline не сохранен:', {
        hasPipeline: !!pipeline,
        hasSelectedProject: !!selectedProject
      });
    }
  };

  const handleLogout = () => {
    logout();
  };

  // Загружаем сохраненные данные при инициализации
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        console.log('🔄 Загружаем сохраненные данные при инициализации...');
        
        // Загружаем сохраненный проект
        const storedProject = getSelectedProject();
        if (storedProject) {
          console.log('📁 Загружаем сохраненный проект:', storedProject.name);
          
          // Проверяем, что pipeline принадлежит этому проекту
          const storedPipeline = getSelectedPipeline();
          console.log('📋 Найден сохраненный pipeline:', storedPipeline);
          
          if (storedPipeline && validateStoredData(storedProject.id)) {
            console.log('✅ Pipeline валиден для проекта:', storedPipeline.name);
            // Сохраняем информацию о том, что нужно восстановить pipeline
            // Pipeline будет загружен автоматически в PipelineList
          } else if (storedPipeline) {
            console.log('⚠️ Pipeline не валиден для проекта:', {
              pipelineProjectId: storedPipeline.projectId,
              currentProjectId: storedProject.id
            });
          }
        } else {
          console.log('ℹ️ Сохраненный проект не найден');
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки сохраненных данных:', error);
      }
    };

    loadStoredData();
  }, []);

  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [pipelines, setPipelines] = useState<PipelineResponse[]>([]);

  // Загружаем проекты один раз при инициализации
  useEffect(() => {
    const loadProjects = async () => {
      try {
        console.log('📁 Загружаем проекты...');
        const data = await apiService.getProjects();
        setProjects(data);
        
        if (data.length > 0) {
          // Пытаемся восстановить сохраненный проект
          const storedProject = getSelectedProject();
          let projectToRestore: ProjectResponse;

          if (storedProject) {
            // Ищем сохраненный проект в списке
            const foundProject = data.find((p: ProjectResponse) => p.id === storedProject.id);
            if (foundProject) {
              console.log('📁 Восстанавливаем сохраненный проект:', foundProject.name);
              projectToRestore = foundProject;
            } else {
              console.log('⚠️ Сохраненный проект не найден, выбираем первый');
              projectToRestore = data[0];
            }
          } else {
            console.log('ℹ️ Сохраненный проект не найден, выбираем первый');
            projectToRestore = data[0];
          }

          // Восстанавливаем проект
          if (!selectedProject || selectedProject.id !== projectToRestore.id) {
            console.log('🔄 Восстанавливаем проект в Dashboard:', projectToRestore.name);
            setSelectedProject(projectToRestore);
          }
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки проектов:', error);
      }
    };

    loadProjects();
  }, []); // Загружаем только один раз при монтировании

  // Загружаем pipelines при изменении проекта
  useEffect(() => {
    const loadPipelines = async () => {
      if (!selectedProject) {
        setPipelines([]);
        return;
      }

      try {
        console.log('📋 Загружаем pipelines для проекта:', selectedProject.name);
        const data = await apiService.getPipelines(selectedProject.id);
        const sortedPipelines = data.sort((a, b) => a.sort_order - b.sort_order);
        setPipelines(sortedPipelines);
        
        // Пытаемся восстановить сохраненный pipeline
        const storedPipeline = getSelectedPipeline();
        if (storedPipeline && validateStoredData(selectedProject.id)) {
          const foundPipeline = sortedPipelines.find(p => p.id === storedPipeline.id);
          if (foundPipeline && (!selectedPipeline || selectedPipeline.id !== foundPipeline.id)) {
            console.log('📋 Восстанавливаем сохраненный pipeline:', foundPipeline.name);
            setSelectedPipeline(foundPipeline);
          }
        } else if (sortedPipelines.length > 0 && !selectedPipeline) {
          // Выбираем первый pipeline если нет сохраненного
          console.log('🔄 Выбираем первый доступный pipeline:', sortedPipelines[0].name);
          setSelectedPipeline(sortedPipelines[0]);
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки pipelines:', error);
      }
    };

    loadPipelines();
  }, [selectedProject]); // Загружаем при изменении проекта



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Верхняя панель */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Логотип и название */}
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Nadder</h1>
            </div>

            {/* Выбор проекта */}
            <div className="flex-1 mx-8">
              <ProjectSelector
                projects={projects}
                selectedProject={selectedProject}
                onProjectSelect={handleProjectSelect}
              />
            </div>

            {/* Пользователь и выход */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <User className="h-4 w-4" />
                <span>{user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Выйти</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Основной контент */}
                        <main className="w-full px-2 sm:px-4 lg:px-6 py-4">
                    {selectedProject ? (
            <div className="flex space-x-4">
              {/* Левая панель со списком pipeline */}
              <div className="flex-shrink-0">
                <PipelineList
                  key={selectedProject.id}
                  projectId={selectedProject.id}
                  pipelines={pipelines}
                  selectedPipeline={selectedPipeline}
                  onPipelineSelect={handlePipelineSelect}
                  onSettingsOpen={setIsPipelineSettingsOpen}
                />
              </div>

              {/* Основная область с Kanban доской */}
              <div className="flex-1">
                {selectedPipeline ? (
                  <KanbanBoard
                    key={`${selectedProject.id}-${selectedPipeline?.id || 'no-pipeline'}`}
                    projectId={selectedProject.id}
                    selectedPipeline={selectedPipeline}
                    isPipelineSettingsOpen={isPipelineSettingsOpen}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center text-gray-500">
                      <p className="text-lg">Выберите pipeline для отображения Kanban доски</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-full max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary-600 text-2xl font-bold">N</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Добро пожаловать в Nadder
                </h2>
                <p className="text-gray-600 mb-6">
                  Выберите проект для начала работы или создайте новый
                </p>
              </div>
                                    </div>
                      )}
                    </main>
    </div>
  );
};

export default Dashboard;
