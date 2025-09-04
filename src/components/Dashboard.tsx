import React, { useState, useEffect } from 'react';
import { LogOut, User, Cloud } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import ProjectSelector from './projects/ProjectSelector';
import PipelineList from './pipelines/PipelineList';
import KanbanBoard from './kanban/KanbanBoard';
import BackupManager from './backup/BackupManager';
import CardSearch from './common/CardSearch';

import { ProjectResponse, PipelineResponse, CardSearchResult } from '../types/api';
import { getSelectedProject, getSelectedPipeline, validateStoredData, saveSelectedProject, saveSelectedPipeline, clearSelectedPipeline, clearAllStoredData, saveProjectPipeline, getProjectPipeline } from '../utils/storage';
import apiService from '../services/api';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [selectedProject, setSelectedProject] = useState<ProjectResponse | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineResponse | null>(null);
  const [isPipelineSettingsOpen, setIsPipelineSettingsOpen] = useState(false);
  const [isRestoringData, setIsRestoringData] = useState(true); // Состояние восстановления данных
  const [forceReloadKey, setForceReloadKey] = useState<string>(''); // Ключ для принудительной перезагрузки Kanban
  const [isBackupManagerOpen, setIsBackupManagerOpen] = useState(false); // Состояние менеджера бекапов
  const [cardToOpen, setCardToOpen] = useState<number | null>(null); // ID карточки для автоматического открытия


  // Логируем изменения состояния настроек pipeline
  useEffect(() => {
    console.log('🔧 Dashboard: Состояние настроек pipeline изменилось:', isPipelineSettingsOpen, 'тип:', typeof isPipelineSettingsOpen);
  }, [isPipelineSettingsOpen]);

  const handleProjectSelect = (project: ProjectResponse) => {
    console.log('🔄 Выбираем проект:', project.name);
    
    // Проверяем, изменился ли проект
    const isProjectChanged = selectedProject?.id !== project.id;
    
    // Устанавливаем выбранный проект
    setSelectedProject(project);
    
    // Сбрасываем выбранный pipeline только при смене проекта
    if (isProjectChanged) {
      setSelectedPipeline(null);
      // Не очищаем сохраненный pipeline, так как теперь сохраняем для каждого проекта отдельно
      console.log('🔄 Проект изменился, пайплайн будет восстановлен из сохраненных данных');
    }
    
    // Сбрасываем ключ принудительной перезагрузки
    setForceReloadKey('');
    
    // Сохраняем выбранный проект
    saveSelectedProject(project);
    console.log('💾 Сохранен выбранный проект:', project.name);
  };

  const handleProjectDelete = async (projectId: number) => {
    try {
      await apiService.deleteProject(projectId);
      console.log('🗑️ Проект удален:', projectId);
      
      // Обновляем список проектов, удаляем удаленный проект
      setProjects(prev => {
        const updatedProjects = prev.filter(project => project.id !== projectId);
        console.log('📋 Список проектов обновлен после удаления:', {
          удаленПроект: projectId,
          осталосьПроектов: updatedProjects.length
        });
        
        // Если удаляемый проект был выбран, выбираем другой или сбрасываем
        if (selectedProject?.id === projectId) {
          if (updatedProjects.length > 0) {
            // Выбираем первый доступный проект
            const newSelectedProject = updatedProjects[0];
            console.log('🔄 Выбираем новый проект после удаления:', newSelectedProject.name);
            setSelectedProject(newSelectedProject);
            saveSelectedProject(newSelectedProject);
            
            // Сбрасываем pipeline при смене проекта
            setSelectedPipeline(null);
            clearSelectedPipeline();
          } else {
            // Если проектов не осталось, сбрасываем все
            console.log('📭 Проектов не осталось, сбрасываем выбор');
            setSelectedProject(null);
            setSelectedPipeline(null);
            clearSelectedPipeline();
          }
        }
        
        return updatedProjects;
      });
      
    } catch (error) {
      console.error('❌ Ошибка удаления проекта:', error);
      throw error; // Пробрасываем ошибку дальше
    }
  };

  const handleCardSearchSelect = async (card: CardSearchResult) => {
    console.log('🔍 Выбрана карточка из поиска:', card);
    
    // Находим проект по ID
    const targetProject = projects.find(p => p.id === card.project_id);
    if (!targetProject) {
      console.error('Проект не найден:', card.project_id);
      return;
    }
    
    // Переключаемся на нужный проект
    if (selectedProject?.id !== targetProject.id) {
      console.log('🔄 Переключаемся на проект:', targetProject.name);
      setSelectedProject(targetProject);
      saveSelectedProject(targetProject);
    }
    
    // Загружаем пайплайны для проекта
    try {
      const pipelines = await apiService.getPipelines(targetProject.id);
      const sortedPipelines = pipelines.sort((a, b) => a.sort_order - b.sort_order);
      
      // Находим нужный пайплайн
      const targetPipeline = sortedPipelines.find(p => p.id === card.pipeline_id);
      if (targetPipeline) {
        console.log('🔄 Переключаемся на пайплайн:', targetPipeline.name);
        setSelectedPipeline(targetPipeline);
        saveProjectPipeline(targetProject.id, targetPipeline);
      }
      
      // Устанавливаем ID карточки для автоматического открытия
      setCardToOpen(card.id);
      
      // Принудительно обновляем Kanban, чтобы он перезагрузил карточки
      setForceReloadKey(Date.now().toString());
      
    } catch (error) {
      console.error('Ошибка загрузки пайплайнов:', error);
    }
  };

  const handlePipelineSelect = (pipeline: PipelineResponse | null) => {
    console.log('🔄 handlePipelineSelect вызван с:', {
      pipeline: pipeline ? { id: pipeline.id, name: pipeline.name, project_id: pipeline.project_id } : null,
      selectedProject: selectedProject ? { id: selectedProject.id, name: selectedProject.name } : null
    });
    
    setSelectedPipeline(pipeline);
    
    // Сбрасываем ключ принудительной перезагрузки при смене pipeline
    setForceReloadKey('');
    
    // Сохраняем выбранный pipeline, если он есть
    if (pipeline && selectedProject) {
      const pipelineData = {
        id: pipeline.id,
        name: pipeline.name,
        projectId: pipeline.project_id,
      };
      console.log('💾 Сохраняем pipeline данные:', pipelineData);
      saveSelectedPipeline(pipelineData);
      
      // Сохраняем пайплайн для конкретного проекта
      saveProjectPipeline(selectedProject.id, { id: pipeline.id, name: pipeline.name });
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
      
      // Сортируем по sort_order
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
          setIsRestoringData(false);
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
        // Сбрасываем состояние восстановления данных даже при ошибке
        setIsRestoringData(false);
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
        
        // Сортируем по sort_order
        const sortedPipelines = data.sort((a, b) => a.sort_order - b.sort_order);
        setPipelines(sortedPipelines);
        console.log('✅ Pipelines загружены:', sortedPipelines.length);
        
        // Пытаемся восстановить сохраненный pipeline для этого проекта
        const storedProjectPipeline = getProjectPipeline(selectedProject.id);
        if (storedProjectPipeline) {
          const foundPipeline = sortedPipelines.find(p => p.id === storedProjectPipeline.id);
          if (foundPipeline) {
            console.log('📋 Восстанавливаем сохраненный pipeline для проекта:', foundPipeline.name);
            setSelectedPipeline(foundPipeline);
          } else {
            // Если сохраненный pipeline не найден, выбираем первый
            console.log('⚠️ Сохраненный pipeline для проекта не найден в списке, выбираем первый:', sortedPipelines[0].name);
            setSelectedPipeline(sortedPipelines[0]);
          }
        } else if (sortedPipelines.length > 0) {
          // Выбираем первый pipeline если нет сохраненного для этого проекта
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
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Верхняя панель */}
      <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Логотип и название */}
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Nadder</h1>
            </div>

            {/* Выбор проекта и поиск */}
            <div className="flex-1 mx-8 flex items-center space-x-4">
              <div className="flex-1">
                <ProjectSelector
                  projects={projects}
                  selectedProject={selectedProject}
                  onProjectSelect={handleProjectSelect}
                  onProjectDelete={handleProjectDelete}
                  onProjectCreate={(project) => {
                    console.log('🆕 Новый проект создан, добавляем в список:', project.name);
                    setProjects(prev => [...prev, project].sort((a, b) => a.name.localeCompare(b.name)));
                  }}
                />
              </div>
              <div className="w-80">
                <CardSearch onCardSelect={handleCardSearchSelect} />
              </div>
            </div>

            {/* Пользователь и выход */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <User className="h-4 w-4" />
                <span>{user?.name}</span>
              </div>
              <button
                onClick={() => setIsBackupManagerOpen(true)}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                title="Управление бекапами"
              >
                <Cloud className="h-4 w-4" />
                <span>Бекапы</span>
              </button>
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

      {/* Основной контент с горизонтальным скроллом */}
      <main className="flex-1 overflow-x-auto">
        <div className="px-2 sm:px-4 lg:px-6 py-4">
          {isRestoringData ? (
            // Индикатор восстановления данных
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Восстанавливаем сохраненные настройки...</p>
              </div>
            </div>
          ) : selectedProject ? (
              <div className="flex min-w-max">
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
                    onStatusesUpdate={() => {
                      console.log('🔄 Статусы обновлены в настройках, перезагружаем данные Kanban');
                      // Принудительно перезагружаем данные Kanban доски
                      if (selectedPipeline) {
                        // Принудительно перезагружаем данные, изменяя key
                        // Это заставит React пересоздать KanbanBoard компонент
                        const newKey = `${selectedProject.id}-${selectedPipeline.id}-${Date.now()}`;
                        setForceReloadKey(newKey);
                      }
                    }}
                  />
                </div>

                {/* Основная область с Kanban доской */}
                <div className="flex-1 min-w-0">
                  {selectedPipeline ? (
                    <KanbanBoard
                      key={forceReloadKey || `${selectedProject.id}-${selectedPipeline?.id || 'no-pipeline'}`}
                      projectId={selectedProject.id}
                      pipelineId={selectedPipeline.id}
                      cardToOpen={cardToOpen}
                      onCardOpened={() => setCardToOpen(null)}
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
        </div>
      </main>

      {/* Менеджер бекапов */}
      <BackupManager
        isOpen={isBackupManagerOpen}
        onClose={() => setIsBackupManagerOpen(false)}
      />


    </div>
  );
};

export default Dashboard;
