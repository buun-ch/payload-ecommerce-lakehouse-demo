'use client';

import { useAuth } from '@payloadcms/ui';
import { AIAssistantProvider } from './AIAssistantProvider';
import type { ReactNode } from 'react';

export function PayloadAdminAIProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Only show AI assistant when user is logged in
  if (!user) {
    return <>{children}</>;
  }

  return <AIAssistantProvider>{children}</AIAssistantProvider>;
}
