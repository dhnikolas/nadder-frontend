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
    console.log('💾 Сохраняем проект в localStorage:', storedProject);
    localStorage.setItem(STORAGE_KEYS.SELECTED_PROJECT, JSON.stringify(storedProject));
    console.log('✅ Проект успешно сохранен в localStorage');
  } catch (error) {
    console.error('❌ Ошибка сохранения выбранного проекта:', error);
  }
};

export const getSelectedProject = (): StoredProject | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_PROJECT);
    if (!stored) {
      console.log('ℹ️ Проект в localStorage не найден');
      return null;
    }
    
    const project = JSON.parse(stored) as StoredProject;
    console.log('📁 Найден проект в localStorage:', project);
    
    // Проверяем, что данные не устарели (старше 30 дней)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    if (project.timestamp < thirtyDaysAgo) {
      console.log('⚠️ Проект устарел, удаляем из localStorage');
      localStorage.removeItem(STORAGE_KEYS.SELECTED_PROJECT);
      return null;
    }
    
    console.log('✅ Проект валиден, возвращаем:', project);
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
    console.log('💾 Сохраняем pipeline в localStorage:', storedPipeline);
    localStorage.setItem(STORAGE_KEYS.SELECTED_PIPELINE, JSON.stringify(storedPipeline));
    console.log('✅ Pipeline успешно сохранен в localStorage');
  } catch (error) {
    console.error('❌ Ошибка сохранения выбранного pipeline:', error);
  }
};

export const getSelectedPipeline = (): StoredPipeline | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_PIPELINE);
    if (!stored) {
      console.log('ℹ️ Pipeline в localStorage не найден');
      return null;
    }
    
    const pipeline = JSON.parse(stored) as StoredPipeline;
    console.log('📋 Найден pipeline в localStorage:', pipeline);
    
    // Проверяем, что данные не устарели (старше 30 дней)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    if (pipeline.timestamp < thirtyDaysAgo) {
      console.log('⚠️ Pipeline устарел, удаляем из localStorage');
      localStorage.removeItem(STORAGE_KEYS.SELECTED_PIPELINE);
      return null;
    }
    
    console.log('✅ Pipeline валиден, возвращаем:', pipeline);
    return pipeline;
  } catch (error) {
    console.error('❌ Ошибка получения выбранного pipeline:', error);
    return null;
  }
};

export const clearSelectedPipeline = (): void => {
  try {
    console.log('🧹 Очищаем pipeline из localStorage');
    localStorage.removeItem(STORAGE_KEYS.SELECTED_PIPELINE);
    console.log('✅ Pipeline успешно очищен из localStorage');
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
    console.log('💾 Сохраняем пайплайн для проекта:', { projectId, pipeline });
    localStorage.setItem(STORAGE_KEYS.PROJECT_PIPELINES, JSON.stringify(storedPipelines));
    console.log('✅ Пайплайн для проекта успешно сохранен');
  } catch (error) {
    console.error('❌ Ошибка сохранения пайплайна для проекта:', error);
  }
};

export const getProjectPipeline = (projectId: number): { id: number; name: string; timestamp: number } | null => {
  try {
    const storedPipelines = getProjectPipelines();
    const pipeline = storedPipelines[projectId];
    
    if (!pipeline) {
      console.log('ℹ️ Пайплайн для проекта не найден:', projectId);
      return null;
    }
    
    // Проверяем, что данные не устарели (старше 30 дней)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    if (pipeline.timestamp < thirtyDaysAgo) {
      console.log('⚠️ Пайплайн для проекта устарел, удаляем:', projectId);
      delete storedPipelines[projectId];
      localStorage.setItem(STORAGE_KEYS.PROJECT_PIPELINES, JSON.stringify(storedPipelines));
      return null;
    }
    
    console.log('✅ Пайплайн для проекта валиден:', { projectId, pipeline });
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
    console.log('ℹ️ Нет сохраненного pipeline для валидации');
    return false;
  }
  
  // Проверяем, что pipeline принадлежит текущему проекту
  const isValid = storedPipeline.projectId === projectId;
  console.log('🔍 Валидация pipeline:', {
    storedPipelineProjectId: storedPipeline.projectId,
    currentProjectId: projectId,
    isValid
  });
  
  return isValid;
};
