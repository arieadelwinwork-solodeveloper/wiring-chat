import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppRedirect from './components/AppRedirect';
import PageLoader from './components/PageLoader';
import UnauthorizedHandler from './components/UnauthorizedHandler';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';

const InternalChat = lazy(() => import('./pages/InternalChat'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));

function LazyPage({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <UnauthorizedHandler />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/verify-email"
            element={(
              <LazyPage>
                <VerifyEmail />
              </LazyPage>
            )}
          />
          <Route
            path="/reset-password"
            element={(
              <LazyPage>
                <ResetPassword />
              </LazyPage>
            )}
          />
          <Route
            path="/chat/:roomId"
            element={(
              <ProtectedRoute>
                <LazyPage>
                  <InternalChat />
                </LazyPage>
              </ProtectedRoute>
            )}
          />
          <Route
            path="/chat"
            element={(
              <ProtectedRoute>
                <LazyPage>
                  <InternalChat />
                </LazyPage>
              </ProtectedRoute>
            )}
          />
          <Route path="/" element={<AppRedirect />} />
          <Route
            path="*"
            element={(
              <LazyPage>
                <NotFound />
              </LazyPage>
            )}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
