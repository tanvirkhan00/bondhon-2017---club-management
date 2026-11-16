/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AuthProvider } from './contexts/AuthContext';
import { ClubDataProvider } from './contexts/ClubDataContext';
import { AppRoutes } from './routes/AppRoutes';

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <ClubDataProvider>
            <AppRoutes />
          </ClubDataProvider>
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
