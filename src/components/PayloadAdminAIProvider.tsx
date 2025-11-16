'use client';

import { useAuth } from '@payloadcms/ui';
import { AIAssistantProvider } from './AIAssistantProvider';
import type { ReactNode } from 'react';

export function PayloadAdminAIProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Check if AI assistant is enabled via environment variable
  const isAIAssistantEnabled = process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED === 'true';

  // Only show AI assistant when user is logged in AND feature is enabled
  if (!user || !isAIAssistantEnabled) {
    return <>{children}</>;
  }

  return <AIAssistantProvider>{children}</AIAssistantProvider>;
}
