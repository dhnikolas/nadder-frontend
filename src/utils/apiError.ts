/** Сообщение об ошибке из ответа Axios / сети для показа пользователю */
export function getApiErrorMessage(error: unknown): string {
  const err = error as {
    response?: { data?: unknown; status?: number };
    message?: string;
  };

  if (!err?.response && err?.message === 'Network Error') {
    return 'Нет соединения с сервером. Проверьте сеть.';
  }

  const data = err.response?.data;
  if (typeof data === 'string' && data.trim()) {
    return data;
  }
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message) return o.message;
    if (typeof o.detail === 'string' && o.detail) return o.detail;
    if (typeof o.error === 'string' && o.error) return o.error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Не удалось выполнить операцию. Попробуйте ещё раз.';
}
