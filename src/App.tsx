import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import Dashboard from './components/Dashboard';


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

  return (
    <div>
      {isLogin ? (
        <div>
          <LoginForm />
          <div className="text-center pb-8">
            <p className="text-gray-600">
              Нет аккаунта?{' '}
              <button
                onClick={() => setIsLogin(false)}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Зарегистрироваться
              </button>
            </p>
          </div>
        </div>
      ) : (
        <div>
          <RegisterForm />
          <div className="text-center pb-8">
            <p className="text-gray-600">
              Уже есть аккаунт?{' '}
              <button
                onClick={() => setIsLogin(true)}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Войти
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
