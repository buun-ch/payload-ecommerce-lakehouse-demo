'use client';

import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useChatRuntime } from '@assistant-ui/react-ai-sdk';
import { AssistantSidebar } from '@/components/assistant-ui/assistant-sidebar';
import type { ReactNode } from 'react';

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  const runtime = useChatRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantSidebar>{children}</AssistantSidebar>
    </AssistantRuntimeProvider>
  );
}
