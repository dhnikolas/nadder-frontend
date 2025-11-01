import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, Download, CheckCircle, AlertCircle, Clock, Edit3, Save, XCircle, X } from 'lucide-react';
import { BackupStatusResponse, BackupSettingsRequest } from '../../types/api';
import apiService from '../../services/api';

interface BackupManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const BackupManager: React.FC<BackupManagerProps> = ({ isOpen, onClose }) => {
  const [backupStatus, setBackupStatus] = useState<BackupStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditingInterval, setIsEditingInterval] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(30);


  // Загружаем статус бекапа при открытии
  useEffect(() => {
    if (isOpen) {
      loadBackupStatus();
    }
  }, [isOpen]);

  const loadBackupStatus = async () => {
    try {
      setIsLoading(true);
      const status = await apiService.getBackupStatus();
      setBackupStatus(status);
      setError('');
      setSuccess(''); // Очищаем сообщение об успехе
      
      // Устанавливаем интервал из статуса
      if (status.is_configured && status.interval_minutes) {
        setIntervalMinutes(status.interval_minutes);
      } else {
        setIntervalMinutes(30); // Значение по умолчанию
      }
    } catch (error: any) {
      console.error('Ошибка загрузки статуса бекапа:', error);
      setError('Не удалось загрузить статус бекапа');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectYandex = async () => {
    try {
      setIsConnecting(true);
      setError('');
      setSuccess(''); // Очищаем предыдущие сообщения об успехе
      
      // Получаем URL для авторизации
      const authData = await apiService.getYandexAuthUrl();
      
      // Проверяем, что URL получен корректно
      const authUrl = authData.auth_url;
      if (!authUrl || authUrl === 'about:blank') {
        throw new Error('Не удалось получить URL для авторизации');
      }
      
      // Открываем окно авторизации
      const authWindow = window.open(
        authUrl,
        'yandex_auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Проверяем, что окно открылось
      if (!authWindow) {
        throw new Error('Не удалось открыть окно авторизации. Возможно, заблокированы всплывающие окна.');
      }

      // Проверяем статус интеграции каждые 2 секунды
      const checkStatus = setInterval(async () => {
        try {
          const status = await apiService.getBackupStatus();
          
          if (status.is_configured) {
            clearInterval(checkStatus);
            
            if (!authWindow.closed) {
              authWindow.close();
            }
            setIsConnecting(false);
            
            // Перезагружаем статус (модальное окно остается открытым)
            setTimeout(() => {
              loadBackupStatus();
            }, 1000);
          }
        } catch (error) {
          // Игнорируем ошибки при проверке статуса
        }
      }, 2000); // Проверяем каждые 2 секунды

      // Таймаут на случай, если что-то пойдет не так
      setTimeout(() => {
        clearInterval(checkStatus);
        if (!authWindow.closed) {
          authWindow.close();
        }
        setIsConnecting(false);
        
        // Перезагружаем статус (модальное окно остается открытым)
        setTimeout(() => {
          loadBackupStatus();
        }, 1000);
      }, 60000); // 60 секунд таймаут

    } catch (error: any) {
      console.error('Ошибка подключения к Yandex:', error);
      setError('Не удалось подключиться к Yandex Disk');
      setIsConnecting(false);
    }
  };

  const handleEnableBackup = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const settings: BackupSettingsRequest = {
        enabled: true,
        interval_minutes: intervalMinutes
      };
      
      await apiService.updateBackupSettings(settings);
      setSuccess('Автоматические бекапы включены!');
      
      // Перезагружаем статус
      await loadBackupStatus();
      
    } catch (error: any) {
      console.error('Ошибка включения бекапов:', error);
      setError('Не удалось включить автоматические бекапы');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableBackup = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const settings: BackupSettingsRequest = {
        enabled: false,
        interval_minutes: 30
      };
      
      await apiService.updateBackupSettings(settings);
      setSuccess('Автоматические бекапы отключены');
      
      // Перезагружаем статус
      await loadBackupStatus();
      
    } catch (error: any) {
      console.error('Ошибка отключения бекапов:', error);
      setError('Не удалось отключить автоматические бекапы');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateManualBackup = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      await apiService.createManualBackup();
      setSuccess('Ручной бекап создан успешно!');
      
      // Перезагружаем статус
      await loadBackupStatus();
      
    } catch (error: any) {
      console.error('Ошибка создания ручного бекапа:', error);
      setError('Не удалось создать ручной бекап');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      await apiService.disconnectYandex();
      setSuccess('Интеграция с Yandex Disk отключена');
      
      // Перезагружаем статус
      await loadBackupStatus();
      
    } catch (error: any) {
      console.error('Ошибка отключения:', error);
      setError('Не удалось отключить интеграцию');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveInterval = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const settings: BackupSettingsRequest = {
        enabled: backupStatus?.is_enabled || false,
        interval_minutes: intervalMinutes
      };
      
      await apiService.updateBackupSettings(settings);
      setSuccess('Интервал бекапов обновлен!');
      setIsEditingInterval(false);
      loadBackupStatus();
    } catch (error: any) {
      console.error('Ошибка обновления интервала:', error);
      setError('Не удалось обновить интервал бекапов');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingInterval(false);
    // Восстанавливаем исходное значение
    if (backupStatus?.is_configured) {
      loadBackupStatus();
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Никогда';
    return new Date(dateString).toLocaleString('ru-RU');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Cloud className="h-5 w-5 mr-2" />
            Бекапы Yandex Disk
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Загрузка...</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-green-700 text-sm">{success}</span>
              </div>
            </div>
          )}

          {backupStatus && (
            <div className="space-y-4">
              {/* Статус подключения */}
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Статус подключения:</span>
                  <div className="flex items-center">
                    {backupStatus.is_configured ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-sm text-green-600">Подключено</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                        <span className="text-sm text-red-600">Не подключено</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Статус автобэкапов */}
              {backupStatus.is_configured && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Автоматические бекапы:</span>
                    <div className="flex items-center">
                      {backupStatus.is_enabled ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-sm text-green-600">Включены</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="text-sm text-yellow-600">Отключены</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {backupStatus.is_enabled && (
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Последний бекап: {formatDate(backupStatus.last_backup)}</div>
                      <div>Следующий бекап: {formatDate(backupStatus.next_backup)}</div>
                      <div>Всего бекапов: {backupStatus.backup_count}</div>
                      
                      {/* Редактирование интервала */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <span className="text-xs text-gray-600">
                          Интервал: {isEditingInterval ? '' : `${intervalMinutes} мин`}
                        </span>
                        {isEditingInterval ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="1"
                              max="1440"
                              value={intervalMinutes}
                              onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 30)}
                              className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              onClick={handleSaveInterval}
                              disabled={isLoading}
                              className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                              title="Сохранить"
                            >
                              <Save className="h-3 w-3" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={isLoading}
                              className="p-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                              title="Отменить"
                            >
                              <XCircle className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setIsEditingInterval(true)}
                            className="p-1 text-blue-600 hover:text-blue-700"
                            title="Редактировать интервал"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Кнопки управления */}
              <div className="space-y-2">
                {!backupStatus.is_configured ? (
                  <div className="space-y-3">
                    <button
                      onClick={handleConnectYandex}
                      disabled={isConnecting}
                      className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isConnecting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Подключение...
                        </>
                      ) : (
                        <>
                          <Cloud className="h-4 w-4 mr-2" />
                          Подключить Yandex Disk
                        </>
                      )}
                    </button>
                    {isConnecting && (
                      <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-700">
                          Окно авторизации открыто. После завершения авторизации окно закроется автоматически.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {!backupStatus.is_enabled ? (
                      <button
                        onClick={handleEnableBackup}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Включить автобэкапы
                      </button>
                    ) : (
                      <button
                        onClick={handleDisableBackup}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Отключить автобэкапы
                      </button>
                    )}

                    <button
                      onClick={handleCreateManualBackup}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Создать ручной бекап
                    </button>

                    <button
                      onClick={handleDisconnect}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      <CloudOff className="h-4 w-4 mr-2" />
                      Отключить интеграцию
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackupManager;
