import { AudioChunk, ProcessedAudio } from '../types';
import { logger, logAudioProcessing } from '../utils/logger';

export class AudioProcessor {
  private targetSampleRate: number;
  private sourceSampleRate: number;

  constructor(targetSampleRate: number = 24000) {
    this.targetSampleRate = targetSampleRate;
    this.sourceSampleRate = 48000; // Most common sample rate for microphones
  }

  /**
   * Process audio chunk - convert from 48kHz to 24kHz
   * Equivalent to Python's process_audio_chunk method
   */
  processAudioChunk(audioData: Buffer): Buffer {
    const startTime = Date.now();
    
    try {
      // Convert binary audio data to Int16 array (equivalent to np.frombuffer)
      const pcmData = new Int16Array(audioData.buffer, audioData.byteOffset, audioData.length / 2);
      
      // Convert to float32 for better precision during resampling
      const floatData = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        floatData[i] = pcmData[i] / 32768.0;
      }
      
      // Resample from 48kHz to 24kHz (simple decimation by 2)
      // This is a simplified version of scipy.signal.resample_poly
      const resampledData = this.resampleAudio(floatData, this.sourceSampleRate, this.targetSampleRate);
      
      // Convert back to int16 while preserving amplitude
      const resampledInt16 = new Int16Array(resampledData.length);
      for (let i = 0; i < resampledData.length; i++) {
        const sample = Math.round(resampledData[i] * 32768.0);
        resampledInt16[i] = Math.max(-32768, Math.min(32767, sample));
      }
      
      const result = Buffer.from(resampledInt16.buffer);
      const processingTime = Date.now() - startTime;
      
      // Log audio processing occasionally (every ~100 chunks)
      if (Math.random() < 0.01) {
        logAudioProcessing('chunk_processed', {
          inputSize: audioData.length,
          outputSize: result.length,
          processingTime,
          sampleRateConversion: `${this.sourceSampleRate}Hz -> ${this.targetSampleRate}Hz`,
        });
      }
      
      return result;
    } catch (error) {
      logAudioProcessing('processing_error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Simple audio resampling - decimation by 2 for 48kHz to 24kHz
   * This is a simplified version that works specifically for our use case
   */
  private resampleAudio(inputData: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) {
      return inputData;
    }
    
    // For 48kHz to 24kHz, we can use simple decimation (take every 2nd sample)
    if (fromRate === 48000 && toRate === 24000) {
      const outputLength = Math.floor(inputData.length / 2);
      const outputData = new Float32Array(outputLength);
      
      for (let i = 0; i < outputLength; i++) {
        outputData[i] = inputData[i * 2];
      }
      
      return outputData;
    }
    
    // For other ratios, use linear interpolation
    const ratio = fromRate / toRate;
    const outputLength = Math.floor(inputData.length / ratio);
    const outputData = new Float32Array(outputLength);
    
    for (let i = 0; i < outputLength; i++) {
      const sourceIndex = i * ratio;
      const index = Math.floor(sourceIndex);
      const fraction = sourceIndex - index;
      
      if (index + 1 < inputData.length) {
        outputData[i] = inputData[index] * (1 - fraction) + inputData[index + 1] * fraction;
      } else {
        outputData[i] = inputData[index];
      }
    }
    
    return outputData;
  }

  /**
   * Process audio chunk with metadata
   */
  processChunk(chunk: AudioChunk): ProcessedAudio {
    const originalSize = chunk.data.length;
    const processedData = this.processAudioChunk(chunk.data);
    
    return {
      data: processedData,
      originalSize,
      processedSize: processedData.length,
    };
  }

  /**
   * Validate audio format
   */
  validateAudioFormat(chunk: AudioChunk): boolean {
    // Check if the chunk has valid data
    if (!chunk.data || chunk.data.length === 0) {
      return false;
    }
    
    // Check if the data length is even (16-bit samples)
    if (chunk.data.length % 2 !== 0) {
      return false;
    }
    
    // Check sample rate
    if (chunk.sampleRate !== this.sourceSampleRate) {
      logger.warn(`Unexpected sample rate: ${chunk.sampleRate}, expected: ${this.sourceSampleRate}`);
    }
    
    return true;
  }

  /**
   * Save audio buffer to file (for debugging purposes)
   * Note: This is a simplified version - in production you might want to use a proper WAV library
   */
  saveAudioBuffer(audioBuffer: Buffer[], filename: string): void {
    try {
      const totalLength = audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
      const combinedBuffer = Buffer.concat(audioBuffer, totalLength);
      
      // For now, just save the raw PCM data
      // In a full implementation, you'd add WAV headers
      require('fs').writeFileSync(filename, combinedBuffer);
      logger.info(`Saved audio buffer to ${filename} (${totalLength} bytes)`);
    } catch (error) {
      logger.error({ error, filename }, 'Failed to save audio buffer');
    }
  }

  // Getters
  get targetRate(): number {
    return this.targetSampleRate;
  }

  get sourceRate(): number {
    return this.sourceSampleRate;
  }
}