import React, { useState } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DragIndicatorProvider } from './contexts/DragIndicatorContext';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import Dashboard from './components/Dashboard';
import { isElectron } from './utils/isElectron';

// Компонент для защищенных маршрутов
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

// Компонент для переключения между формами
const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  const loginFooter = (
    <div className="text-center mt-10 pb-8">
      <p className="text-gray-600">
        Нет аккаунта?{' '}
        <button
          type="button"
          onClick={() => setIsLogin(false)}
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Зарегистрироваться
        </button>
      </p>
    </div>
  );

  const registerFooter = (
    <div className="text-center mt-10 pb-8">
      <p className="text-gray-600">
        Уже есть аккаунт?{' '}
        <button
          type="button"
          onClick={() => setIsLogin(true)}
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Войти
        </button>
      </p>
    </div>
  );

  return (
    <>
      {isLogin ? <LoginForm footer={loginFooter} /> : <RegisterForm footer={registerFooter} />}
    </>
  );
};

const App: React.FC = () => {
  const isElectronApp = isElectron();
  // Используем HashRouter для Electron (работает с file://), BrowserRouter для web
  const Router = isElectronApp ? HashRouter : BrowserRouter;

  return (
    <DndProvider backend={HTML5Backend}>
      <AuthProvider>
        <Router>
          <div className={isElectronApp ? 'App h-screen overflow-hidden flex flex-col' : 'App'}>
            {/* Белая полоса для перетаскивания окна (только для Electron) */}
            {isElectronApp && (
              <div 
                className="fixed top-0 left-0 right-0 bg-white z-50"
                style={{ 
                  WebkitAppRegion: 'drag',
                  height: '28px' // Высота соответствует кнопкам macOS
                } as React.CSSProperties}
              />
            )}
            {/* Отступ под title bar; в Electron высота задаётся flex, без 100vh+padding */}
            <div
              className={
                isElectronApp
                  ? 'flex-1 min-h-0 flex flex-col pt-[28px]'
                  : undefined
              }
            >
              <div className={isElectronApp ? 'flex-1 min-h-0 flex flex-col' : undefined}>
              <Routes>
                <Route path="/login" element={<AuthPage />} />
                <Route path="/register" element={<AuthPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DragIndicatorProvider>
                        <Dashboard />
                      </DragIndicatorProvider>
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </div>
            </div>
          </div>
        </Router>
      </AuthProvider>
    </DndProvider>
  );
};

export default App;
