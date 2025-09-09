// Утилиты для работы с localStorage

const STORAGE_KEYS = {
  SELECTED_PROJECT: 'nadder_selected_project',
  SELECTED_PIPELINE: 'nadder_selected_pipeline',
  PROJECT_PIPELINES: 'nadder_project_pipelines', // Сохраняем пайплайн для каждого проекта
} as const;

// Типы для сохранения в localStorage
interface StoredProject {
  id: number;
  name: string;
  timestamp: number;
}

interface StoredPipeline {
  id: number;
  name: string;
  projectId: number;
  timestamp: number;
}

// Функции для работы с проектами
export const saveSelectedProject = (project: { id: number; name: string }): void => {
  try {
    const storedProject: StoredProject = {
      id: project.id,
      name: project.name,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.SELECTED_PROJECT, JSON.stringify(storedProject));
  } catch (error) {
    console.error('❌ Ошибка сохранения выбранного проекта:', error);
  }
};

export const getSelectedProject = (): StoredProject | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_PROJECT);
    if (!stored) {
      return null;
    }
    
    const project = JSON.parse(stored) as StoredProject;
    
    // Проверяем, что данные не устарели (старше 30 дней)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    if (project.timestamp < thirtyDaysAgo) {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_PROJECT);
      return null;
    }
    
    return project;
  } catch (error) {
    console.error('❌ Ошибка получения выбранного проекта:', error);
    return null;
  }
};

export const clearSelectedProject = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.SELECTED_PROJECT);
  } catch (error) {
    console.error('Ошибка очистки выбранного проекта:', error);
  }
};

// Функции для работы с pipeline
export const saveSelectedPipeline = (pipeline: { id: number; name: string; projectId: number }): void => {
  try {
    const storedPipeline: StoredPipeline = {
      id: pipeline.id,
      name: pipeline.name,
      projectId: pipeline.projectId,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.SELECTED_PIPELINE, JSON.stringify(storedPipeline));
  } catch (error) {
    console.error('❌ Ошибка сохранения выбранного pipeline:', error);
  }
};

export const getSelectedPipeline = (): StoredPipeline | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_PIPELINE);
    if (!stored) {
      return null;
    }
    
    const pipeline = JSON.parse(stored) as StoredPipeline;
    
    // Проверяем, что данные не устарели (старше 30 дней)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    if (pipeline.timestamp < thirtyDaysAgo) {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_PIPELINE);
      return null;
    }
    
    return pipeline;
  } catch (error) {
    console.error('❌ Ошибка получения выбранного pipeline:', error);
    return null;
  }
};

export const clearSelectedPipeline = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.SELECTED_PIPELINE);
  } catch (error) {
    console.error('❌ Ошибка очистки выбранного pipeline:', error);
  }
};

// Функции для работы с пайплайнами по проектам
export const saveProjectPipeline = (projectId: number, pipeline: { id: number; name: string }): void => {
  try {
    const storedPipelines = getProjectPipelines();
    storedPipelines[projectId] = {
      id: pipeline.id,
      name: pipeline.name,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.PROJECT_PIPELINES, JSON.stringify(storedPipelines));
  } catch (error) {
    console.error('❌ Ошибка сохранения пайплайна для проекта:', error);
  }
};

export const getProjectPipeline = (projectId: number): { id: number; name: string; timestamp: number } | null => {
  try {
    const storedPipelines = getProjectPipelines();
    const pipeline = storedPipelines[projectId];
    
    if (!pipeline) {
      return null;
    }
    
    // Проверяем, что данные не устарели (старше 30 дней)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    if (pipeline.timestamp < thirtyDaysAgo) {
      delete storedPipelines[projectId];
      localStorage.setItem(STORAGE_KEYS.PROJECT_PIPELINES, JSON.stringify(storedPipelines));
      return null;
    }
    
    return pipeline;
  } catch (error) {
    console.error('❌ Ошибка получения пайплайна для проекта:', error);
    return null;
  }
};

const getProjectPipelines = (): Record<number, { id: number; name: string; timestamp: number }> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PROJECT_PIPELINES);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('❌ Ошибка получения пайплайнов проектов:', error);
    return {};
  }
};

// Функция для очистки всех сохраненных данных
export const clearAllStoredData = (): void => {
  try {
    clearSelectedProject();
    clearSelectedPipeline();
  } catch (error) {
    console.error('Ошибка очистки всех сохраненных данных:', error);
  }
};

// Функция для проверки совместимости сохраненных данных
export const validateStoredData = (projectId: number): boolean => {
  const storedPipeline = getSelectedPipeline();
  if (!storedPipeline) {
    return false;
  }
  
  // Проверяем, что pipeline принадлежит текущему проекту
  const isValid = storedPipeline.projectId === projectId;
  
  return isValid;
};
