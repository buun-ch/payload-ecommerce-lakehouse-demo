"use client";

import {
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { MessageSquare, X } from "lucide-react";
import { type FC, type PropsWithChildren, useRef, useState } from "react";
import { type ImperativePanelHandle } from "react-resizable-panels";

import { Thread } from "@/components/assistant-ui/thread";

export const AssistantSidebar: FC<PropsWithChildren> = ({ children }) => {
  const panelRef = useRef<ImperativePanelHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const toggleSidebar = () => {
    const panel = panelRef.current;
    if (panel) {
      if (isCollapsed) {
        panel.expand();
      } else {
        panel.collapse();
      }
    }
  };

  return (
    <>
      <ResizablePanelGroup direction="horizontal" id="ai-assistant-panels" className="ai-assistant-sidebar">
        <ResizablePanel defaultSize={75} minSize={30} id="main-content">
          {children}
        </ResizablePanel>

        {!isCollapsed && <div className="ai-assistant-separator" />}

        <ResizablePanel
          ref={panelRef}
          defaultSize={25}
          minSize={15}
          maxSize={50}
          collapsible={true}
          collapsedSize={0}
          id="ai-assistant"
          onCollapse={() => setIsCollapsed(true)}
          onExpand={() => setIsCollapsed(false)}
        >
          <div className="ai-assistant-panel-content">
            <div className="ai-assistant-header">
              <h2>AI Assistant</h2>
              <div className="ai-assistant-header-buttons">
                <button
                  onClick={toggleSidebar}
                  className="ai-assistant-header-button"
                  aria-label="Close assistant"
                  title="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="ai-assistant-thread-wrapper">
              <Thread />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {isCollapsed && (
        <button onClick={toggleSidebar} aria-label="Open AI assistant">
          <MessageSquare className="size-5" />
        </button>
      )}
    </>
  );
};
