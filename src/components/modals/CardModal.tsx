import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { CardResponse, CreateCardRequest, StatusResponse, MoveCardRequest } from '../../types/api';
import { getApiErrorMessage } from '../../utils/apiError';
import { encryptCardDescription, decryptCardDescription } from '../../utils/secretCardCrypto';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card?: CardResponse | null;
  onUpdate?: (cardId: number, cardData: { title?: string; description?: string; secret?: boolean }) => Promise<void>;
  onCreateCard?: (cardData: CreateCardRequest) => Promise<void>;
  onMoveCard?: (cardId: number, data: MoveCardRequest) => Promise<void>;
  statusId?: number;
  statuses?: StatusResponse[];
  /** Режим создания секретной карточки (два поля пароля до ввода текста) */
  isSecretCreate?: boolean;
}

const CardModal: React.FC<CardModalProps> = ({
  isOpen,
  onClose,
  card,
  onUpdate,
  onCreateCard,
  onMoveCard,
  statusId,
  statuses = [],
  isSecretCreate = false,
}) => {
  const getInitialContent = () => {
    if (card && !card.secret) {
      return card.title + (card.description ? '\n' + card.description : '');
    }
    if (card?.secret) {
      return card.title;
    }
    return '';
  };

  const [content, setContent] = useState(getInitialContent);
  const [isLoading, setIsLoading] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [isMouseDownInside, setIsMouseDownInside] = useState(false);
  const [initialContent, setInitialContent] = useState(getInitialContent);
  const [formError, setFormError] = useState('');
  const [moveError, setMoveError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [secretCreateUnlocked, setSecretCreateUnlocked] = useState(false);
  const [pwCreate1, setPwCreate1] = useState('');
  const [pwCreate2, setPwCreate2] = useState('');

  const [secretEditUnlocked, setSecretEditUnlocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');

  /** Пароль только в памяти на время работы с модалкой; не сохраняется */
  const sessionPasswordRef = useRef<string | null>(null);

  const parseContent = (text: string) => {
    const lines = text.split('\n');
    const title = lines[0] || '';
    const description = lines.slice(1).join('\n');
    return { title, description };
  };

  const hasChanges = () => content.trim() !== initialContent.trim();

  const resetSecretUiState = () => {
    setSecretCreateUnlocked(false);
    setPwCreate1('');
    setPwCreate2('');
    setSecretEditUnlocked(false);
    setUnlockPassword('');
    setUnlockError('');
    sessionPasswordRef.current = null;
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    setFormError('');
    setMoveError('');
    resetSecretUiState();
    if (card) {
      if (card.secret) {
        setContent(card.title);
        setInitialContent(card.title);
        setSecretEditUnlocked(false);
      } else {
        const combined = card.title + (card.description ? '\n' + card.description : '');
        setContent(combined);
        setInitialContent(combined);
      }
    } else {
      setContent('');
      setInitialContent('');
      if (isSecretCreate) {
        setSecretCreateUnlocked(false);
      }
    }
  }, [card, isOpen, isSecretCreate]);

  useEffect(() => {
    if (!isOpen) {
      resetSecretUiState();
      setFormError('');
      setMoveError('');
    }
  }, [isOpen]);

  const MIN_SECRET_PASSWORD_LEN = 8;

  useEffect(() => {
    if (
      isSecretCreate &&
      pwCreate1.length >= MIN_SECRET_PASSWORD_LEN &&
      pwCreate1 === pwCreate2
    ) {
      setSecretCreateUnlocked(true);
      sessionPasswordRef.current = pwCreate1;
      setPwCreate1('');
      setPwCreate2('');
    }
  }, [isSecretCreate, pwCreate1, pwCreate2]);

  useEffect(() => {
    if (!isOpen || !textareaRef.current) return;
    const needPasswordGate =
      (Boolean(card?.secret) && !secretEditUnlocked) ||
      (isSecretCreate && !secretCreateUnlocked);
    if (needPasswordGate) return;
    const textarea = textareaRef.current;
    const textLength = textarea.value.length;
    textarea.setSelectionRange(textLength, textLength);
    textarea.focus();
  }, [isOpen, card?.secret, secretEditUnlocked, isSecretCreate, secretCreateUnlocked]);

  const isEditMode = !!card;

  const handleMoveClick = () => {
    if (card) {
      setMoveError('');
      setSelectedStatusId(card.status_id);
      setIsMoveModalOpen(true);
    }
  };

  const handleMoveConfirm = async () => {
    if (!card || !selectedStatusId || !onMoveCard || selectedStatusId === card.status_id) {
      setIsMoveModalOpen(false);
      return;
    }

    setMoveError('');
    setIsLoading(true);
    try {
      await onMoveCard(card.id, { status_id: selectedStatusId });
      setIsMoveModalOpen(false);
      onClose();
    } catch (error) {
      console.error('Ошибка перемещения карточки:', error);
      setMoveError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveCancel = () => {
    setIsMoveModalOpen(false);
    setSelectedStatusId(null);
    setMoveError('');
  };

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsMouseDownInside(false);
    }
  };

  const handleBackdropClick = async (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isMouseDownInside) {
      await handleSaveAndClose();
    }
  };

  const handleModalMouseDown = () => {
    setIsMouseDownInside(true);
  };

  const handleUnlockSecretEdit = async () => {
    if (!card?.secret || !card.description) {
      setUnlockError('Нет данных для расшифровки');
      return;
    }
    setUnlockError('');
    setIsLoading(true);
    try {
      const plain = await decryptCardDescription(card.description, unlockPassword);
      sessionPasswordRef.current = unlockPassword;
      setUnlockPassword('');
      const combined = card.title + (plain ? '\n' + plain : '');
      setContent(combined);
      setInitialContent(combined);
      setSecretEditUnlocked(true);
    } catch {
      setUnlockError('Неверный пароль');
      sessionPasswordRef.current = null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (): Promise<boolean> => {
    if (isLoading) return false;

    const passwordGateCreate = isSecretCreate && !secretCreateUnlocked;
    const passwordGateEdit = Boolean(card?.secret) && !secretEditUnlocked;
    if (passwordGateCreate || passwordGateEdit) return false;

    const { title, description } = parseContent(content);

    setFormError('');
    setIsLoading(true);
    try {
      if (isEditMode && card && onUpdate) {
        if (card.secret) {
          const pwd = sessionPasswordRef.current;
          if (!pwd) {
            throw new Error('Нет пароля для сохранения');
          }
          const enc = await encryptCardDescription(description.trim(), pwd);
          await onUpdate(card.id, {
            title: title.trim() || 'Без названия',
            description: enc,
            secret: true,
          });
        } else {
          await onUpdate(card.id, {
            title: title.trim() || 'Без названия',
            description: description.trim(),
          });
        }
        const newContent =
          (title.trim() || 'Без названия') + (description.trim() ? '\n' + description.trim() : '');
        setInitialContent(newContent);
      } else if (!isEditMode && onCreateCard && statusId) {
        if (isSecretCreate) {
          const pwd = sessionPasswordRef.current;
          if (!pwd) {
            throw new Error('Нет пароля для сохранения');
          }
          const enc = await encryptCardDescription(description.trim(), pwd);
          await onCreateCard({
            title: title.trim() || 'Без названия',
            description: enc,
            secret: true,
          });
        } else {
          await onCreateCard({
            title: title.trim() || 'Без названия',
            description: description.trim(),
          });
        }
        const newContent =
          (title.trim() || 'Без названия') + (description.trim() ? '\n' + description.trim() : '');
        setInitialContent(newContent);
      } else {
        setFormError('Не удалось сохранить: нет данных для запроса к серверу.');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Ошибка сохранения карточки:', error);
      setFormError(getApiErrorMessage(error));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndClose = async () => {
    if (isLoading) return;
    if (!hasChanges()) {
      onClose();
      return;
    }
    const ok = await handleSave();
    if (ok) onClose();
  };

  const handleCloseWithoutSave = () => {
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSave();
  };

  const textareaDisabled =
    (isSecretCreate && !secretCreateUnlocked) || (Boolean(card?.secret) && !secretEditUnlocked);

  const canSave =
    !textareaDisabled &&
    !isLoading &&
    hasChanges() &&
    (!isSecretCreate || secretCreateUnlocked) &&
    (!card?.secret || secretEditUnlocked);

  const showCreatePasswordPanel = Boolean(!card && isSecretCreate && !secretCreateUnlocked);
  const showEditPasswordPanel = Boolean(card?.secret && !secretEditUnlocked);
  /** Кнопки «Создать»/«Сохранить» только после ввода паролей, не на экранах разблокировки */
  const showEditorPrimaryButton = !showCreatePasswordPanel && !showEditPasswordPanel;

  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
          .first-line-bold::first-line {
            font-weight: bold;
          }
        `}
      </style>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]"
        onMouseDown={handleBackdropMouseDown}
        onClick={handleBackdropClick}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 h-[80vh] overflow-hidden flex flex-col"
          onMouseDown={handleModalMouseDown}
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit} className="p-4 h-full flex flex-col min-h-0">
            <div className="flex-1 relative min-h-0 flex flex-col">
              {showCreatePasswordPanel && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 px-6">
                  <p className="text-sm text-gray-600 mb-4 text-center max-w-md">
                    Введите пароль дважды одинаково (не менее {MIN_SECRET_PASSWORD_LEN} символов). После совпадения
                    можно будет заполнить карточку.
                  </p>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={pwCreate1}
                    onChange={(e) => setPwCreate1(e.target.value)}
                    placeholder="Пароль"
                    className="w-full max-w-sm px-3 py-2 mb-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={pwCreate2}
                    onChange={(e) => setPwCreate2(e.target.value)}
                    placeholder="Повторите пароль"
                    className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}

              {showEditPasswordPanel && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 px-6">
                  <p className="text-sm text-gray-600 mb-4 text-center max-w-md">
                    Секретная карточка. Введите пароль, чтобы просмотреть и изменить содержимое.
                  </p>
                  <input
                    type="password"
                    autoComplete="off"
                    value={unlockPassword}
                    onChange={(e) => {
                      setUnlockPassword(e.target.value);
                      setUnlockError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUnlockSecretEdit();
                      }
                    }}
                    placeholder="Пароль"
                    className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md"
                  />
                  {unlockError && <p className="text-sm text-red-600 mt-2">{unlockError}</p>}
                  <button
                    type="button"
                    onClick={handleUnlockSecretEdit}
                    disabled={isLoading || !unlockPassword}
                    className="mt-4 px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Проверка...' : 'Разблокировать'}
                  </button>
                </div>
              )}

              <textarea
                ref={textareaRef}
                id="content"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setFormError('');
                }}
                disabled={textareaDisabled}
                className="w-full flex-1 min-h-[200px] px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-0 focus:border-gray-300 resize-none first-line-bold disabled:bg-gray-50 disabled:text-gray-500"
                placeholder={
                  textareaDisabled && card?.secret
                    ? 'Содержимое скрыто до ввода пароля'
                    : 'Введите название карточки (первая строка)\nИ описание карточки (остальные строки)'
                }
                required={!textareaDisabled}
                autoFocus={!textareaDisabled}
                style={{
                  fontFamily: 'monospace',
                  lineHeight: '1.5',
                  fontWeight: 'normal',
                }}
              />
            </div>

            {formError && (
              <div
                className="mt-3 flex-shrink-0 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 flex items-start gap-2"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" aria-hidden />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex justify-between items-center mt-4 flex-shrink-0">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCloseWithoutSave}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors font-medium"
                >
                  Отмена
                </button>

                {showEditorPrimaryButton && (
                  <button
                    type="submit"
                    disabled={!canSave}
                    className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isLoading ? (isEditMode ? 'Сохранение...' : 'Создание...') : isEditMode ? 'Сохранить' : 'Создать'}
                  </button>
                )}
              </div>

              {isEditMode && card && onMoveCard && statuses.length > 1 && (!card.secret || secretEditUnlocked) && (
                <button
                  type="button"
                  onClick={handleMoveClick}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors font-medium border border-blue-200 hover:border-blue-300"
                >
                  Переместить
                </button>
              )}
            </div>
          </form>
        </div>

        {isMoveModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1001]"
            onClick={handleMoveCancel}
          >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Переместить карточку</h3>

                {moveError && (
                  <div
                    className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 flex items-start gap-2"
                    role="alert"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" aria-hidden />
                    <span>{moveError}</span>
                  </div>
                )}

                <div className="mb-6">
                  <label htmlFor="status-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Выберите статус
                  </label>
                  <select
                    id="status-select"
                    value={selectedStatusId || ''}
                    onChange={(e) => setSelectedStatusId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {statuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleMoveCancel}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors font-medium"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleMoveConfirm}
                    disabled={isLoading || !selectedStatusId || selectedStatusId === card?.status_id}
                    className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isLoading ? 'Перемещение...' : 'Переместить'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CardModal;
