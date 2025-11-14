import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

export const runtime = 'nodejs';

export async function GET(_req: Request) {
  try {
    const result = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      prompt: 'What are the top 3 metrics to track for an ecommerce business? Be concise.',
    });

    return Response.json({
      success: true,
      text: result.text,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Error in AI test route:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
