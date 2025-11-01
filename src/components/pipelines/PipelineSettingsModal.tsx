import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Edit, ChevronUp, ChevronDown } from 'lucide-react';
import { PipelineResponse, StatusResponse, CreateStatusRequest, UpdateStatusRequest } from '../../types/api';
import apiService from '../../services/api';

interface PipelineSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipeline: PipelineResponse | null;
  projectId: number;
  onStatusesUpdate?: () => void;
}

const PipelineSettingsModal: React.FC<PipelineSettingsModalProps> = ({
  isOpen,
  onClose,
  pipeline,
  projectId,
  onStatusesUpdate,
}) => {
  const [statuses, setStatuses] = useState<StatusResponse[]>([]);
  const [isCreatingStatus, setIsCreatingStatus] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<CreateStatusRequest>({
    name: '',
    color: '#3B82F6',
  });
  const [editingStatus, setEditingStatus] = useState<UpdateStatusRequest>({});
  const [isLoading, setIsLoading] = useState(false);

  const loadStatuses = useCallback(async () => {
    if (!pipeline) return;
    
    try {
      const data = await apiService.getStatuses(projectId, pipeline.id);
      
      // Сортируем по текущему sort_order, затем по id для устойчивости
      const sortedStatuses = data.sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }
        return a.id - b.id; // Если sort_order одинаковый, сортируем по id
      });
      
      // Проверяем наличие дублирующихся sort_order
      const sortOrders = sortedStatuses.map(s => s.sort_order);
      const hasDuplicates = sortOrders.length !== new Set(sortOrders).size;
      
      if (hasDuplicates) {
        
        // Создаем статусы с исправленными sort_order (начиная с 1)
        const statusesWithFixedOrder = sortedStatuses.map((status, index) => ({
          ...status,
          sort_order: index + 1
        }));
        
        for (let i = 0; i < statusesWithFixedOrder.length; i++) {
          const status = statusesWithFixedOrder[i];
          await apiService.updateStatus(projectId, pipeline.id, status.id, {
            sort_order: i + 1,
          });
        }
        
        setStatuses(statusesWithFixedOrder);
      } else {
        setStatuses(sortedStatuses);
      }
    } catch (error) {
      console.error('Ошибка загрузки статусов:', error);
    }
  }, [projectId, pipeline]);

  useEffect(() => {
    
    if (isOpen && pipeline) {
      loadStatuses();
    }
  }, [isOpen, projectId, pipeline, loadStatuses]);

  const handleCreateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pipeline || !newStatus.name.trim()) return;

    setIsLoading(true);
    try {
      // Вычисляем правильный sort_order для нового статуса (начиная с 1)
      const maxSortOrder = statuses.length > 0 ? Math.max(...statuses.map(s => s.sort_order)) : 0;
      const newSortOrder = maxSortOrder + 1;
      
      
      const createdStatus = await apiService.createStatus(projectId, pipeline.id, {
        ...newStatus,
        sort_order: newSortOrder,
      });
      
      // Добавляем новый статус в конец списка
      const updatedStatuses = [...statuses, { ...createdStatus, sort_order: newSortOrder }];
      setStatuses(updatedStatuses);
      
      setNewStatus({ name: '', color: '#3B82F6' });
      setIsCreatingStatus(false);
      
      
      // Уведомляем родительский компонент об обновлении статусов
      if (onStatusesUpdate) {
        onStatusesUpdate();
      }
    } catch (error) {
      console.error('Ошибка создания статуса:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number) => {
    if (!pipeline || (!editingStatus.name && !editingStatus.color)) return;

    setIsLoading(true);
    try {
      const updatedStatus = await apiService.updateStatus(projectId, pipeline.id, id, editingStatus);
      setStatuses(statuses.map(s => s.id === id ? updatedStatus : s));
      setEditingStatusId(null);
      setEditingStatus({});
      
      // Уведомляем родительский компонент об обновлении статусов
      if (onStatusesUpdate) {
        onStatusesUpdate();
      }
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStatus = async (id: number) => {
    if (!pipeline) return;
    
    if (!window.confirm('Вы уверены, что хотите удалить этот статус?')) return;

    try {
      await apiService.deleteStatus(projectId, pipeline.id, id);
      
      // Фильтруем удаленный статус и пересчитываем sort_order (начиная с 1)
      const filteredStatuses = statuses.filter(s => s.id !== id);
      const reorderedStatuses = filteredStatuses.map((status, index) => ({
        ...status,
        sort_order: index + 1,
      }));
      
      
      // Обновляем sort_order на сервере для всех оставшихся статусов
      if (reorderedStatuses.length > 0) {
        const updatePromises = reorderedStatuses.map((status, index) => {
          return apiService.updateStatus(projectId, pipeline.id, status.id, {
            sort_order: index + 1,
          });
        });
        
        // Ждем завершения всех обновлений
        await Promise.all(updatePromises);
      }
      
      setStatuses(reorderedStatuses);
      
      // Уведомляем родительский компонент об обновлении статусов
      if (onStatusesUpdate) {
        onStatusesUpdate();
      }
    } catch (error) {
      console.error('Ошибка удаления статуса:', error);
    }
  };


  const moveStatus = async (statusId: number, direction: 'up' | 'down') => {
    if (!pipeline) return;

    const currentIndex = statuses.findIndex(s => s.id === statusId);
    if (currentIndex === -1) return;

    let newIndex: number;
    if (direction === 'up' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < statuses.length - 1) {
      newIndex = currentIndex + 1;
    } else {
      return; // Нельзя двигать дальше
    }


    try {
      // Создаем копию массива статусов
      const reorderedStatuses = [...statuses];
      
      // Меняем местами статусы
      [reorderedStatuses[currentIndex], reorderedStatuses[newIndex]] = 
      [reorderedStatuses[newIndex], reorderedStatuses[currentIndex]];
      
      // Обновляем sort_order для ВСЕХ статусов, начиная с 1 (важно: делаем это правильно)
      const updatedStatuses = reorderedStatuses.map((status, index) => ({
        ...status,
        sort_order: index + 1,
      }));
      
      
      // Обновляем sort_order на сервере для всех статусов последовательно
      // Используем Promise.all чтобы убедиться, что все запросы выполнены
      const updatePromises = updatedStatuses.map((status, index) => {
        return apiService.updateStatus(projectId, pipeline.id, status.id, {
          sort_order: index + 1,
        });
      });
      
      // Ждем завершения всех обновлений
      await Promise.all(updatePromises);
      
      // Обновляем локальное состояние только после успешного обновления на сервере
      setStatuses(updatedStatuses);
      
      // Уведомляем родительский компонент об обновлении статусов
      if (onStatusesUpdate) {
        onStatusesUpdate();
      }
      
    } catch (error) {
      console.error('❌ Ошибка обновления sort_order статусов:', error);
      // В случае ошибки перезагружаем статусы с сервера
      loadStatuses();
    }
  };





  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  if (!isOpen || !pipeline) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Настройки: {pipeline.name}
          </h3>
          <button
            onClick={() => {
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Основные настройки pipeline */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 mb-3">Основные настройки</h4>
            <div className="flex items-center space-x-3">
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: pipeline.color }}
              />
              <span className="text-sm text-gray-700">{pipeline.name}</span>
            </div>
          </div>

          {/* Управление статусами */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-md font-medium text-gray-900">
                  Статусы
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  💡 Используйте кнопки ↑↓ для изменения порядка
                </p>
              </div>
              <button
                onClick={() => setIsCreatingStatus(!isCreatingStatus)}
                className="flex items-center space-x-2 px-3 py-2 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700"
                title="Добавить статус"
              >
                <Plus className="h-4 w-4" />
                <span>Добавить статус</span>
              </button>
            </div>

            {/* Форма создания статуса */}
            {isCreatingStatus && (
              <div className="mb-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                <form onSubmit={handleCreateStatus} className="space-y-3">
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={newStatus.name}
                      onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
                      placeholder="Название статуса"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      autoFocus
                    />
                    <div className="flex space-x-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewStatus({ ...newStatus, color })}
                          className={`w-8 h-8 rounded-full border-2 ${
                            newStatus.color === color ? 'border-gray-400' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingStatus(false)}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || !newStatus.name.trim()}
                      className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                    >
                      {isLoading ? 'Создание...' : 'Создать'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Список статусов */}
            <div className="space-y-2 min-h-[100px]">
              {statuses.map((status, index) => (
                <div
                  key={status.id}
                  className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-md hover:shadow-md transition-shadow"
                >
                  {/* Номер порядка */}
                  <div className="flex items-center justify-center w-6 h-6 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                    {index + 1}
                  </div>
                  
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  
                  {editingStatusId === status.id ? (
                    <div className="flex-1 flex space-x-2">
                      <input
                        type="text"
                        value={editingStatus.name || status.name}
                        onChange={(e) => setEditingStatus({ ...editingStatus, name: e.target.value })}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        autoFocus
                      />
                      <div className="flex space-x-1">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditingStatus({ ...editingStatus, color })}
                            className={`w-6 h-6 rounded-full border ${
                              (editingStatus.color || status.color) === color ? 'border-gray-400' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="flex-1 text-sm font-medium text-gray-900">
                      {status.name}
                    </span>
                  )}
                  
                  <div className="flex items-center space-x-1">
                    {/* Кнопки сортировки */}
                    <button
                      onClick={() => moveStatus(status.id, 'up')}
                      disabled={index === 0}
                      className={`p-1 text-gray-400 hover:text-gray-600 ${
                        index === 0 ? 'opacity-30 cursor-not-allowed' : ''
                      }`}
                      title="Переместить вверх"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveStatus(status.id, 'down')}
                      disabled={index === statuses.length - 1}
                      className={`p-1 text-gray-400 hover:text-gray-600 ${
                        index === statuses.length - 1 ? 'opacity-30 cursor-not-allowed' : ''
                      }`}
                      title="Переместить вниз"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    
                    {editingStatusId === status.id ? (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(status.id)}
                          disabled={isLoading}
                          className="p-1 text-green-600 hover:text-green-800"
                          title="Сохранить"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => {
                            setEditingStatusId(null);
                            setEditingStatus({});
                          }}
                          className="p-1 text-gray-600 hover:text-gray-800"
                          title="Отмена"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingStatusId(status.id);
                            setEditingStatus({});
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="Редактировать"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStatus(status.id)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {statuses.length === 0 && !isCreatingStatus && (
              <div className="text-center py-6 text-gray-500">
                <p>Статусы не найдены</p>
                <p className="text-sm">Создайте первый статус для pipeline</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PipelineSettingsModal;
