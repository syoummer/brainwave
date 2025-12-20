import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Readable } from 'stream';
import { getLLMProcessor } from '../services/llm-processor';
import { ReadabilityRequest, AskAIRequest, CorrectnessRequest } from '../types';
import { logger } from '../utils/logger';

// Schema definitions for request validation
const readabilitySchema = {
  body: {
    type: 'object',
    required: ['text'],
    properties: {
      text: { type: 'string', description: 'The text to improve readability for.' }
    }
  }
};

const askAISchema = {
  body: {
    type: 'object',
    required: ['text'],
    properties: {
      text: { type: 'string', description: 'The question to ask AI.' }
    }
  }
};

const correctnessSchema = {
  body: {
    type: 'object',
    required: ['text'],
    properties: {
      text: { type: 'string', description: 'The text to check for factual correctness.' }
    }
  }
};

// Helper function to get LLM processor with error handling
function requireLLMProcessor() {
  try {
    return getLLMProcessor('gpt-4o'); // Default model
  } catch (error) {
    throw new Error('LLM processor is not configured');
  }
}

// Helper function to create streaming response
function createStreamingResponse(generator: AsyncGenerator<string, void, unknown>): Readable {
  const stream = new Readable({
    read() {
      // This will be handled by the async generator
    }
  });

  (async () => {
    try {
      for await (const part of generator) {
        stream.push(part);
      }
      stream.push(null); // End the stream
    } catch (error) {
      stream.destroy(error instanceof Error ? error : new Error(String(error)));
    }
  })();

  return stream;
}

export async function registerTextEnhancementRoutes(server: FastifyInstance) {
  // Import prompts - we'll need to create this
  const PROMPTS = await import('../prompts/prompts').then(m => m.PROMPTS);

  // POST /api/v1/readability - Enhance text readability
  server.post<{ Body: ReadabilityRequest }>('/api/v1/readability', {
    schema: readabilitySchema,
    handler: async (request: FastifyRequest<{ Body: ReadabilityRequest }>, reply: FastifyReply) => {
      const prompt = PROMPTS['readability-enhance'];
      if (!prompt) {
        return reply.status(500).send({ error: 'Readability prompt not found.' });
      }

      try {
        const processor = requireLLMProcessor();

        // Set headers for streaming response
        reply.type('text/plain');
        reply.header('Cache-Control', 'no-cache');
        reply.header('Connection', 'keep-alive');

        // Create streaming response
        const stream = createStreamingResponse(
          processor.processText(request.body.text, prompt, 'gpt-4o')
        );

        return reply.send(stream);
      } catch (error) {
        logger.error('Error enhancing readability:', error);
        return reply.status(500).send({ error: 'Error processing readability enhancement.' });
      }
    }
  });

  // POST /api/v1/ask_ai - Ask AI a question
  server.post<{ Body: AskAIRequest }>('/api/v1/ask_ai', {
    schema: askAISchema,
    handler: async (request: FastifyRequest<{ Body: AskAIRequest }>, reply: FastifyReply) => {
      const prompt = PROMPTS['ask-ai'];
      if (!prompt) {
        return reply.status(500).send({ error: 'Ask AI prompt not found.' });
      }

      try {
        const processor = requireLLMProcessor();
        // Use gpt-4o instead of o1-mini for better compatibility
        const answer = await processor.processTextSync(request.body.text, prompt, 'gpt-4o');
        return { answer };
      } catch (error) {
        logger.error('Error processing AI question:', error);
        return reply.status(500).send({ error: 'Error processing AI question.' });
      }
    }
  });

  // POST /api/v1/correctness - Check factual correctness
  server.post<{ Body: CorrectnessRequest }>('/api/v1/correctness', {
    schema: correctnessSchema,
    handler: async (request: FastifyRequest<{ Body: CorrectnessRequest }>, reply: FastifyReply) => {
      const prompt = PROMPTS['correctness-check'];
      if (!prompt) {
        return reply.status(500).send({ error: 'Correctness prompt not found.' });
      }

      try {
        const processor = requireLLMProcessor();

        // Set headers for streaming response
        reply.type('text/plain');
        reply.header('Cache-Control', 'no-cache');
        reply.header('Connection', 'keep-alive');

        // Create streaming response
        const stream = createStreamingResponse(
          processor.processText(request.body.text, prompt, 'gpt-4o')
        );

        return reply.send(stream);
      } catch (error) {
        logger.error('Error checking correctness:', error);
        return reply.status(500).send({ error: 'Error processing correctness check.' });
      }
    }
  });
}