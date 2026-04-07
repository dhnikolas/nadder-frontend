import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ReauthModal: React.FC = () => {
  const { isReauthRequired, reauthenticate, user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Показываем переавторизацию только в рамках уже открытой рабочей сессии
  if (!isReauthRequired || !user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await reauthenticate(email, password);
      setPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось переавторизоваться');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-primary-100 p-2">
            <Lock className="h-5 w-5 text-primary-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Сессия истекла</h2>
            <p className="text-sm text-gray-600">Введите логин и пароль, чтобы продолжить работу</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="reauth-email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="reauth-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
              placeholder="Введите email"
            />
          </div>

          <div>
            <label htmlFor="reauth-password" className="block text-sm font-medium text-gray-700">
              Пароль
            </label>
            <div className="relative">
              <input
                id="reauth-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                placeholder="Введите пароль"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Проверяем...' : 'Продолжить'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReauthModal;
