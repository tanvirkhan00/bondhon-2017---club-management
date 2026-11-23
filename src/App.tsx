/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AuthProvider } from './contexts/AuthContext';
import { ClubDataProvider } from './contexts/ClubDataContext';
import { AppRoutes } from './routes/AppRoutes';

const AuthCallbackRedirector: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/login') return;
    const combined = `${location.search}${location.hash}`;
    const hasSupabaseAuthParams =
      /(?:^|[?&#])(code|token_hash|access_token|refresh_token|error_code|error_description)=/i.test(
        combined
      ) || /(?:^|[?&#])type=(signup|recovery|invite|magiclink|email)/i.test(combined);

    if (hasSupabaseAuthParams) {
      navigate(`/login${location.search}${location.hash}`, { replace: true });
    }
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
};

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthCallbackRedirector />
        <AuthProvider>
          <ClubDataProvider>
            <AppRoutes />
          </ClubDataProvider>
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
