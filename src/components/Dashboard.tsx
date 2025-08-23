import React, { useState, useEffect } from 'react';
import { LogOut, User } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import ProjectSelector from './projects/ProjectSelector';
import PipelineList from './pipelines/PipelineList';
import KanbanBoard from './kanban/KanbanBoard';
import { ProjectResponse, PipelineResponse } from '../types/api';
import { getSelectedProject, getSelectedPipeline, validateStoredData, saveSelectedProject, saveSelectedPipeline, clearSelectedPipeline, clearAllStoredData } from '../utils/storage';
import apiService from '../services/api';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [selectedProject, setSelectedProject] = useState<ProjectResponse | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineResponse | null>(null);
  const [isPipelineSettingsOpen, setIsPipelineSettingsOpen] = useState(false);
  const [isRestoringData, setIsRestoringData] = useState(true); // Состояние восстановления данных

  // Логируем изменения состояния настроек pipeline
  useEffect(() => {
    console.log('🔧 Dashboard: Состояние настроек pipeline изменилось:', isPipelineSettingsOpen, 'тип:', typeof isPipelineSettingsOpen);
  }, [isPipelineSettingsOpen]);

  const handleProjectSelect = (project: ProjectResponse) => {
    console.log('🔄 Выбираем проект:', project.name);
    
    // Устанавливаем выбранный проект
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

  const handleProjectDelete = async (projectId: number) => {
    try {
      await apiService.deleteProject(projectId);
      console.log('🗑️ Проект удален:', projectId);
      
      // Если удаляемый проект был выбран, сбрасываем выбор
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
        setSelectedPipeline(null);
        clearSelectedPipeline();
        console.log('🧹 Сброшен выбор проекта и pipeline после удаления');
      }
      
      // Обновляем список проектов (нужно будет реализовать в родительском компоненте)
      // Пока что просто логируем
      console.log('📋 Список проектов обновлен после удаления');
      
    } catch (error) {
      console.error('❌ Ошибка удаления проекта:', error);
      throw error; // Пробрасываем ошибку дальше
    }
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

  const handlePipelineUpdate = async () => {
    if (!selectedProject) return;
    
    try {
      console.log('🔄 Обновляем список pipelines для проекта:', selectedProject.name);
      const data = await apiService.getPipelines(selectedProject.id);
      
      // Проверяем, что API вернул массив
      if (!Array.isArray(data)) {
        console.warn('⚠️ API вернул не массив для pipelines при обновлении:', data);
        setPipelines([]);
        return;
      }
      
      const sortedPipelines = data.sort((a, b) => a.sort_order - b.sort_order);
      setPipelines(sortedPipelines);
      console.log('✅ Список pipelines обновлен:', sortedPipelines.length, 'элементов');
      
    } catch (error) {
      console.error('❌ Ошибка обновления pipelines:', error);
    }
  };

  const handleLogout = () => {
    console.log('🚪 Выход из системы, очищаем сохраненные данные...');
    
    // Очищаем все сохраненные данные
    clearAllStoredData();
    console.log('🧹 Все сохраненные данные очищены');
    
    // Выходим из системы
    logout();
  };

  // Автоматически сохраняем выбранный pipeline при его изменении
  // useEffect(() => {
  //   if (selectedPipeline && selectedProject) {
  //     console.log('💾 Автоматически сохраняем выбранный pipeline:', selectedPipeline.name);
  //     const pipelineData = {
  //       id: selectedPipeline.id,
  //       name: selectedPipeline.name,
  //       projectId: selectedProject.id,
  //     };
  //     saveSelectedPipeline(pipelineData);
  //   }
  // }, [selectedPipeline, selectedProject]);

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

  // Загружаем проекты при монтировании компонента
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  
  useEffect(() => {
    const loadProjects = async () => {
      // Защита от повторных запросов
      if (isProjectsLoading) {
        console.log('🔄 Проекты уже загружаются, пропускаем...');
        return;
      }

      try {
        setIsProjectsLoading(true);
        console.log('📋 Загружаем проекты...');
        const data = await apiService.getProjects();
        
        // Проверяем, что API вернул массив
        if (!Array.isArray(data)) {
          console.warn('⚠️ API вернул не массив для проектов:', data);
          setProjects([]);
          return;
        }
        
        // Проекты не имеют sort_order, сортируем по имени
        const sortedProjects = data.sort((a, b) => a.name.localeCompare(b.name));
        setProjects(sortedProjects);
        console.log('✅ Проекты загружены:', sortedProjects.length);
        
        // Пытаемся восстановить сохраненный проект
        const storedProject = getSelectedProject();
        if (storedProject) {
          const projectToRestore = sortedProjects.find(p => p.id === storedProject.id);
          if (projectToRestore) {
            console.log('🔄 Восстанавливаем сохраненный проект:', projectToRestore.name);
            setSelectedProject(projectToRestore);
          } else {
            console.log('⚠️ Сохраненный проект не найден в списке, выбираем первый');
            if (sortedProjects.length > 0) {
              setSelectedProject(sortedProjects[0]);
            }
          }
        } else if (sortedProjects.length > 0) {
          // Если нет сохраненного проекта, выбираем первый
          console.log('🔄 Нет сохраненного проекта, выбираем первый:', sortedProjects[0].name);
          setSelectedProject(sortedProjects[0]);
        }
        
        // Сбрасываем состояние восстановления данных
        setIsRestoringData(false);
        console.log('✅ Восстановление данных завершено');
      } catch (error) {
        console.error('❌ Ошибка загрузки проектов:', error);
      } finally {
        setIsProjectsLoading(false);
      }
    };

    loadProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Загружаем только один раз при монтировании

  // Загружаем pipelines при изменении проекта
  const [isPipelinesLoading, setIsPipelinesLoading] = useState(false);
  
  useEffect(() => {
    const loadPipelines = async () => {
      if (!selectedProject) {
        setPipelines([]);
        setSelectedPipeline(null); // Сбрасываем выбранный pipeline
        return;
      }

      // Защита от повторных запросов
      if (isPipelinesLoading) {
        console.log('🔄 Pipelines уже загружаются, пропускаем...');
        return;
      }

      try {
        setIsPipelinesLoading(true);
        console.log('📋 Загружаем pipelines для проекта:', selectedProject.name);
        const data = await apiService.getPipelines(selectedProject.id);
        
        // Проверяем, что API вернул массив
        if (!Array.isArray(data)) {
          console.warn('⚠️ API вернул не массив для pipelines:', data);
          setPipelines([]);
          setSelectedPipeline(null);
          return;
        }
        
        const sortedPipelines = data.sort((a, b) => a.sort_order - b.sort_order);
        setPipelines(sortedPipelines);
        console.log('✅ Pipelines загружены:', sortedPipelines.length);
        
        // Пытаемся восстановить сохраненный pipeline
        const storedPipeline = getSelectedPipeline();
        if (storedPipeline && storedPipeline.projectId === selectedProject.id) {
          const foundPipeline = sortedPipelines.find(p => p.id === storedPipeline.id);
          if (foundPipeline) {
            console.log('📋 Восстанавливаем сохраненный pipeline:', foundPipeline.name);
            setSelectedPipeline(foundPipeline);
          } else {
            // Если сохраненный pipeline не найден, выбираем первый
            console.log('⚠️ Сохраненный pipeline не найден в списке, выбираем первый:', sortedPipelines[0].name);
            setSelectedPipeline(sortedPipelines[0]);
          }
        } else if (sortedPipelines.length > 0) {
          // Выбираем первый pipeline если нет сохраненного или он принадлежит другому проекту
          console.log('🔄 Выбираем первый доступный pipeline:', sortedPipelines[0].name);
          setSelectedPipeline(sortedPipelines[0]);
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки pipelines:', error);
        setPipelines([]);
        setSelectedPipeline(null);
      } finally {
        setIsPipelinesLoading(false);
      }
    };

    loadPipelines();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id]); // Загружаем только при изменении ID проекта



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
                onProjectDelete={handleProjectDelete}
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
        {isRestoringData ? (
          // Индикатор восстановления данных
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Восстанавливаем сохраненные настройки...</p>
            </div>
          </div>
        ) : selectedProject ? (
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
                  onPipelineUpdate={handlePipelineUpdate}
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
