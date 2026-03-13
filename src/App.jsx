import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ChatLayout from './pages/ChatLayout';
import MainLayout from './pages/MainLayout';
import Feed from './components/Feed';
import { ThemeProvider } from './context/ThemeContext';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import PeoplePage from './pages/PeoplePage';
import './index.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
              <Route index element={<Feed />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="people" element={<PeoplePage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="messenger/*" element={<ChatLayout />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
