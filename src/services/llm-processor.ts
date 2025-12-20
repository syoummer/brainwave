import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

/**
 * Abstract base class for LLM processors
 */
export abstract class LLMProcessor {
  abstract processText(text: string, prompt: string, model?: string): AsyncGenerator<string, void, unknown>;
  abstract processTextSync(text: string, prompt: string, model?: string): Promise<string>;
}

/**
 * OpenAI GPT processor implementation
 */
export class GPTProcessor extends LLMProcessor {
  private client: OpenAI;
  private defaultModel: string = 'gpt-4';

  constructor() {
    super();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not found in environment variables');
    }
    this.client = new OpenAI({ apiKey });
  }

  async *processText(text: string, prompt: string, model?: string): AsyncGenerator<string, void, unknown> {
    const allPrompt = `${prompt}\n\n${text}`;
    const modelName = model || this.defaultModel;
    
    logger.info(`Using model: ${modelName} for processing`);
    logger.info(`Prompt: ${allPrompt}`);

    try {
      const response = await this.client.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'user', content: allPrompt }
        ],
        stream: true
      });

      for await (const chunk of response) {
        if (chunk.choices && chunk.choices[0]?.delta?.content) {
          yield chunk.choices[0].delta.content;
        }
      }
    } catch (error) {
      logger.error('Error in GPT text processing:', error);
      throw error;
    }
  }

  async processTextSync(text: string, prompt: string, model?: string): Promise<string> {
    const allPrompt = `${prompt}\n\n${text}`;
    const modelName = model || this.defaultModel;
    
    logger.info(`Using model: ${modelName} for sync processing`);
    logger.info(`Prompt: ${allPrompt}`);

    try {
      const response = await this.client.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'user', content: allPrompt }
        ]
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      logger.error('Error in GPT sync text processing:', error);
      throw error;
    }
  }
}

/**
 * Google Gemini processor implementation
 */
export class GeminiProcessor extends LLMProcessor {
  private genAI: GoogleGenerativeAI;
  private defaultModel: string;

  constructor(defaultModel: string = 'gemini-1.5-pro') {
    super();
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not set');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.defaultModel = defaultModel;
  }

  async *processText(text: string, prompt: string, model?: string): AsyncGenerator<string, void, unknown> {
    const allPrompt = `${prompt}\n\n${text}`;
    const modelName = model || this.defaultModel;
    
    logger.info(`Using model: ${modelName} for processing`);
    logger.info(`Prompt: ${allPrompt}`);

    try {
      const genaiModel = this.genAI.getGenerativeModel({ model: modelName });
      const response = await genaiModel.generateContentStream(allPrompt);

      for await (const chunk of response.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          yield chunkText;
        }
      }
    } catch (error) {
      logger.error('Error in Gemini text processing:', error);
      throw error;
    }
  }

  async processTextSync(text: string, prompt: string, model?: string): Promise<string> {
    const allPrompt = `${prompt}\n\n${text}`;
    const modelName = model || this.defaultModel;
    
    logger.info(`Using model: ${modelName} for sync processing`);
    logger.info(`Prompt: ${allPrompt}`);

    try {
      const genaiModel = this.genAI.getGenerativeModel({ model: modelName });
      const response = await genaiModel.generateContent(allPrompt);
      
      return response.response.text();
    } catch (error) {
      logger.error('Error in Gemini sync text processing:', error);
      throw error;
    }
  }
}

/**
 * Factory function to get the appropriate LLM processor based on model name
 */
export function getLLMProcessor(model: string): LLMProcessor {
  const modelLower = model.toLowerCase();
  
  if (modelLower.startsWith('gemini')) {
    return new GeminiProcessor(model);
  } else if (modelLower.startsWith('gpt-') || modelLower.startsWith('o1-')) {
    return new GPTProcessor();
  } else {
    throw new Error(`Unsupported model type: ${model}`);
  }
}