import React, { useState } from 'react';
import { ChevronDown, Plus, FolderOpen, Trash2 } from 'lucide-react';
import { ProjectResponse, CreateProjectRequest } from '../../types/api';
import apiService from '../../services/api';

interface ProjectSelectorProps {
  projects: ProjectResponse[];
  selectedProject: ProjectResponse | null;
  onProjectSelect: (project: ProjectResponse) => void;
  onProjectDelete?: (projectId: number) => Promise<void>;
  onProjectCreate?: (project: ProjectResponse) => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({ projects, selectedProject, onProjectSelect, onProjectDelete, onProjectCreate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      
      // Уведомляем родительский компонент о создании нового проекта
      if (onProjectCreate) {
        onProjectCreate(createdProject);
      }
      
      // Выбираем созданный проект
      onProjectSelect(createdProject);
      setNewProjectName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Ошибка создания проекта:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProjectName, setDeleteProjectName] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<{ id: number; name: string } | null>(null);

  const handleDeleteProject = async (projectId: number, projectName: string) => {
    setProjectToDelete({ id: projectId, name: projectName });
    setDeleteProjectName('');
    setIsDeleting(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete || deleteProjectName.trim() !== projectToDelete.name) {
      alert('Название проекта введено неверно. Введите точное название проекта для подтверждения удаления.');
      return;
    }

    try {
      if (onProjectDelete) {
        await onProjectDelete(projectToDelete.id);
        console.log('🗑️ Проект удален:', { id: projectToDelete.id, name: projectToDelete.name });
      } else {
        // Если onProjectDelete не передан, используем API напрямую
        await apiService.deleteProject(projectToDelete.id);
        console.log('🗑️ Проект удален через API:', { id: projectToDelete.id, name: projectToDelete.name });
      }
      
      // Закрываем модал и сбрасываем состояние
      setIsDeleting(false);
      setProjectToDelete(null);
      setDeleteProjectName('');
      
    } catch (error) {
      console.error('Ошибка удаления проекта:', error);
      alert('Ошибка при удалении проекта');
    }
  };

  const cancelDeleteProject = () => {
    setIsDeleting(false);
    setProjectToDelete(null);
    setDeleteProjectName('');
  };

  return (
    <div className="relative z-20">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-[200px] transition-colors duration-200"
        >
          <div className="flex items-center space-x-2 min-w-0">
            <FolderOpen className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 truncate">
              {selectedProject ? selectedProject.name : 'Выберите проект'}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
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
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-300 rounded-md shadow-lg z-10">
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
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
          <div className="py-2">
            {projects.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                Проекты не найдены
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => {
                    onProjectSelect(project);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-100 cursor-pointer transition-colors duration-150 ${
                    selectedProject?.id === project.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{project.name}</div>
                    {project.description && (
                      <div className="text-xs text-gray-500 truncate">{project.description}</div>
                    )}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id, project.name);
                    }}
                    className="ml-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Удалить проект"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления проекта */}
      {isDeleting && projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={cancelDeleteProject}></div>
          <div className="relative bg-white rounded-lg shadow-xl p-6 w-96 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Удаление проекта</h3>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Вы собираетесь удалить проект <span className="font-medium text-gray-900">"{projectToDelete.name}"</span>.
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Это действие нельзя отменить. Все данные проекта будут безвозвратно удалены.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Введите название проекта для подтверждения:
                </label>
                <input
                  type="text"
                  value={deleteProjectName}
                  onChange={(e) => setDeleteProjectName(e.target.value)}
                  placeholder="Введите название проекта"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={cancelDeleteProject}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteProject}
                disabled={deleteProjectName.trim() !== projectToDelete.name}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Удалить проект
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Затемнение при открытых меню */}
      {(isOpen || isCreating || isDeleting) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setIsOpen(false);
            setIsCreating(false);
            if (isDeleting) cancelDeleteProject();
          }}
        />
      )}
    </div>
  );
};

export default ProjectSelector;
