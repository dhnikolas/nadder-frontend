import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, FolderOpen } from 'lucide-react';
import { ProjectResponse, CreateProjectRequest } from '../../types/api';
import apiService from '../../services/api';
import { getSelectedProject } from '../../utils/storage';

interface ProjectSelectorProps {
  selectedProject: ProjectResponse | null;
  onProjectSelect: (project: ProjectResponse) => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({ selectedProject, onProjectSelect }) => {
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await apiService.getProjects();
        setProjects(data);
        
        if (data.length > 0) {
          // Пытаемся загрузить сохраненный проект
          const storedProject = getSelectedProject();
          let projectToSelect: ProjectResponse;
          
          if (storedProject) {
            // Ищем сохраненный проект в списке
            const foundProject = data.find(p => p.id === storedProject.id);
            if (foundProject) {
              console.log('📁 Восстанавливаем сохраненный проект:', foundProject.name);
              projectToSelect = foundProject;
            } else {
              console.log('⚠️ Сохраненный проект не найден, выбираем первый');
              projectToSelect = data[0];
            }
          } else {
            // Если нет сохраненного проекта, выбираем первый
            console.log('ℹ️ Сохраненный проект не найден, выбираем первый доступный');
            projectToSelect = data[0];
          }
          
          // Выбираем проект только если он отличается от текущего
          if (!selectedProject || selectedProject.id !== projectToSelect.id) {
            console.log('🔄 Выбираем проект:', { 
              id: projectToSelect.id, 
              name: projectToSelect.name,
              reason: !selectedProject ? 'нет выбранного' : 'отличается от текущего'
            });
            onProjectSelect(projectToSelect);
          } else {
            console.log('ℹ️ Проект уже выбран:', { 
              id: selectedProject.id, 
              name: selectedProject.name 
            });
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки проектов:', error);
      }
    };

    // Загружаем проекты только если нет выбранного проекта
    if (!selectedProject) {
      loadProjects();
    }
  }, [onProjectSelect, selectedProject]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsLoading(true);
    try {
      const newProject: CreateProjectRequest = {
        name: newProjectName.trim(),
      };
      const createdProject = await apiService.createProject(newProject);
      console.log('🆕 Создан новый проект:', { id: createdProject.id, name: createdProject.name });
      setProjects([...projects, createdProject]);
      onProjectSelect(createdProject);
      setNewProjectName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Ошибка создания проекта:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <FolderOpen className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {selectedProject ? selectedProject.name : 'Выберите проект'}
          </span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>
        
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
          title="Создать новый проект"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Форма создания проекта */}
      {isCreating && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-white border border-gray-300 rounded-md shadow-lg z-10">
          <form onSubmit={handleCreateProject} className="p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Новый проект</h3>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Название проекта"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
            />
            <div className="flex justify-end space-x-2 mt-3">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isLoading || !newProjectName.trim()}
                className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {isLoading ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Выпадающий список проектов */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
          <div className="py-1">
            {projects.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                Проекты не найдены
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    onProjectSelect(project);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                    selectedProject?.id === project.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                  }`}
                >
                  <div className="font-medium">{project.name}</div>
                  {project.description && (
                    <div className="text-xs text-gray-500 truncate">{project.description}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Затемнение при открытых меню */}
      {(isOpen || isCreating) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setIsOpen(false);
            setIsCreating(false);
          }}
        />
      )}
    </div>
  );
};

export default ProjectSelector;
