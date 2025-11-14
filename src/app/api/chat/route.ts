import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

// assistant-ui message format types
interface AssistantUIMessagePart {
  type: string;
  text?: string;
}

interface AssistantUIMessage {
  role: 'user' | 'assistant' | 'system';
  parts?: AssistantUIMessagePart[];
}

// AI SDK message format
interface CoreMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Convert assistant-ui message format to AI SDK core message format
function convertAssistantUIMessages(messages: AssistantUIMessage[]): CoreMessage[] {
  return messages.map((msg) => {
    // Extract text content from parts array
    const content = msg.parts
      ?.map((part) => {
        if (part.type === 'text') return part.text;
        return '';
      })
      .filter(Boolean)
      .join('\n') || '';

    return {
      role: msg.role,
      content,
    };
  });
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Convert assistant-ui messages format to AI SDK core messages format
    const coreMessages = convertAssistantUIMessages(messages);

    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: `You are an AI Business Analyst assistant for an ecommerce platform.

Your role is to help administrators understand their business data and provide insights.

For now, respond conversationally. In later stages, you will have access to actual database tools.`,
      messages: coreMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Error in AI chat route:', error);

    // Return error in a format that the frontend can display
    return new Response(
      JSON.stringify({
        error: 'Failed to process chat request',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
