import { dialog, BrowserWindow } from 'electron';
import { logger, logError } from '../utils/logger';

export interface ErrorDialogOptions {
  title: string;
  content: string;
  detail?: string;
  type?: 'error' | 'warning' | 'info';
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
}

export interface RetryOptions {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier?: number;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private mainWindow: BrowserWindow | null = null;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  /**
   * Show error dialog with enhanced options
   */
  async showErrorDialog(options: ErrorDialogOptions): Promise<number> {
    const {
      title,
      content,
      detail,
      type = 'error',
      buttons = ['确定'],
      defaultId = 0,
      cancelId = 0
    } = options;

    // Log the error for debugging
    logError(new Error(content), { 
      title, 
      detail, 
      type,
      timestamp: new Date().toISOString()
    });

    try {
      const dialogOptions = {
        type,
        title,
        message: content,
        detail,
        buttons,
        defaultId,
        cancelId,
        noLink: true
      };

      const result = this.mainWindow 
        ? await dialog.showMessageBox(this.mainWindow, dialogOptions)
        : await dialog.showMessageBox(dialogOptions);

      // Handle both old and new Electron API formats
      return typeof result === 'number' ? result : (result as any).response;
    } catch (error) {
      // Fallback to simple error box if message box fails
      logger.error('Failed to show message box, falling back to error box:', error);
      dialog.showErrorBox(title, content);
      return 0;
    }
  }

  /**
   * Show simple error dialog (backward compatibility)
   */
  showSimpleError(title: string, content: string): void {
    this.showErrorDialog({ title, content }).catch(error => {
      logger.error('Failed to show error dialog:', error);
    });
  }

  /**
   * Handle server startup errors with user-friendly messages
   */
  async handleServerStartupError(error: Error): Promise<'retry' | 'quit' | 'continue'> {
    let title = '后端服务器启动失败';
    let content = '无法启动后端服务器，这可能会影响应用程序的功能。';
    let detail = error.message;
    let buttons = ['重试', '继续使用', '退出应用'];

    // Customize message based on error type
    if (error.message.includes('EADDRINUSE') || error.message.includes('address already in use')) {
      title = '端口被占用';
      content = '所需的端口已被其他程序占用。应用程序将尝试使用其他可用端口。';
      detail = '如果问题持续存在，请检查是否有其他实例正在运行，或者关闭占用端口的程序。';
      buttons = ['重试', '退出应用'];
    } else if (error.message.includes('timeout')) {
      title = '服务器启动超时';
      content = '后端服务器启动时间过长，可能是系统资源不足或防火墙阻止。';
      detail = '请确保系统有足够的可用内存，并检查防火墙设置。';
    } else if (error.message.includes('permission') || error.message.includes('EACCES')) {
      title = '权限不足';
      content = '没有足够的权限启动后端服务器。';
      detail = '请尝试以管理员身份运行应用程序，或检查文件权限设置。';
    }

    const response = await this.showErrorDialog({
      title,
      content,
      detail,
      type: 'error',
      buttons,
      defaultId: 0,
      cancelId: buttons.length - 1
    });

    // Map response to action
    if (buttons.length === 3) {
      return ['retry', 'continue', 'quit'][response] as 'retry' | 'quit' | 'continue';
    } else {
      return response === 0 ? 'retry' : 'quit';
    }
  }

  /**
   * Handle configuration errors
   */
  async handleConfigurationError(error: Error, context: string): Promise<'reset' | 'quit' | 'continue'> {
    const response = await this.showErrorDialog({
      title: '配置错误',
      content: `${context}时发生配置错误。`,
      detail: `错误详情: ${error.message}\n\n您可以选择重置配置到默认值，或继续使用当前配置。`,
      type: 'warning',
      buttons: ['重置配置', '继续使用', '退出应用'],
      defaultId: 0,
      cancelId: 2
    });

    return ['reset', 'continue', 'quit'][response] as 'reset' | 'quit' | 'continue';
  }

  /**
   * Handle API connection errors
   */
  async handleApiError(service: string, error: Error): Promise<'settings' | 'continue' | 'retry'> {
    let content = `连接到 ${service} 服务时发生错误。`;
    let detail = error.message;
    let buttons = ['打开设置', '继续使用', '重试'];

    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      content = `${service} API 密钥无效或已过期。`;
      detail = '请检查您的 API 密钥是否正确，并确保账户有足够的配额。';
      buttons = ['打开设置', '继续使用'];
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      content = `网络连接问题，无法连接到 ${service} 服务。`;
      detail = '请检查您的网络连接，或稍后重试。在离线模式下，某些功能可能不可用。';
    }

    const response = await this.showErrorDialog({
      title: 'API 连接错误',
      content,
      detail,
      type: 'warning',
      buttons,
      defaultId: 0,
      cancelId: 1
    });

    return ['settings', 'continue', 'retry'][response] as 'settings' | 'continue' | 'retry';
  }

  /**
   * Handle file system errors
   */
  async handleFileSystemError(operation: string, error: Error): Promise<'retry' | 'continue' | 'quit'> {
    let content = `执行文件操作"${operation}"时发生错误。`;
    let detail = error.message;

    if (error.message.includes('ENOENT')) {
      content = `找不到所需的文件或目录。`;
      detail = '应用程序可能需要重新安装，或者某些文件已被意外删除。';
    } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
      content = `没有足够的权限执行文件操作。`;
      detail = '请确保应用程序有足够的权限访问所需的文件和目录。';
    } else if (error.message.includes('ENOSPC')) {
      content = `磁盘空间不足。`;
      detail = '请清理磁盘空间后重试。';
    }

    const response = await this.showErrorDialog({
      title: '文件系统错误',
      content,
      detail,
      type: 'error',
      buttons: ['重试', '继续使用', '退出应用'],
      defaultId: 0,
      cancelId: 2
    });

    return ['retry', 'continue', 'quit'][response] as 'retry' | 'continue' | 'quit';
  }

  /**
   * Retry mechanism with exponential backoff
   */
  async retryOperation<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
    errorContext: string
  ): Promise<T> {
    const { maxRetries, retryDelay, backoffMultiplier = 2 } = options;
    let lastError: Error;
    let currentDelay = retryDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Attempting ${errorContext} (attempt ${attempt}/${maxRetries})`);
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        logError(lastError, {
          context: errorContext,
          attempt,
          maxRetries,
          nextRetryIn: attempt < maxRetries ? currentDelay : null
        });

        if (attempt < maxRetries) {
          logger.info(`Retrying ${errorContext} in ${currentDelay}ms...`);
          await this.delay(currentDelay);
          currentDelay *= backoffMultiplier;
        }
      }
    }

    // All retries failed
    logger.error(`All retry attempts failed for ${errorContext}`);
    throw lastError!;
  }

  /**
   * Show recovery suggestions based on error type
   */
  async showRecoverySuggestions(error: Error, context: string): Promise<void> {
    const suggestions: string[] = [];

    // Add context-specific suggestions
    if (context.includes('server')) {
      suggestions.push('• 检查是否有其他应用程序实例正在运行');
      suggestions.push('• 确保防火墙允许应用程序访问网络');
      suggestions.push('• 重启应用程序');
    }

    if (context.includes('api')) {
      suggestions.push('• 检查网络连接');
      suggestions.push('• 验证 API 密钥是否正确');
      suggestions.push('• 检查 API 服务状态');
    }

    if (context.includes('file')) {
      suggestions.push('• 检查文件权限');
      suggestions.push('• 确保有足够的磁盘空间');
      suggestions.push('• 以管理员身份运行应用程序');
    }

    // Add general suggestions
    suggestions.push('• 重启计算机');
    suggestions.push('• 联系技术支持');

    await this.showErrorDialog({
      title: '故障排除建议',
      content: `遇到问题时，您可以尝试以下解决方案：`,
      detail: suggestions.join('\n'),
      type: 'info',
      buttons: ['确定'],
      defaultId: 0
    });
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle uncaught exceptions
   */
  handleUncaughtException(error: Error): void {
    logError(error, { 
      type: 'uncaught_exception',
      timestamp: new Date().toISOString()
    });

    this.showErrorDialog({
      title: '应用程序错误',
      content: '应用程序遇到了未预期的错误。',
      detail: `错误详情: ${error.message}\n\n应用程序将尝试继续运行，但可能不稳定。建议重启应用程序。`,
      type: 'error',
      buttons: ['确定'],
      defaultId: 0
    }).catch(dialogError => {
      // Last resort: console log
      console.error('Failed to show uncaught exception dialog:', dialogError);
      console.error('Original uncaught exception:', error);
    });
  }

  /**
   * Handle unhandled promise rejections
   */
  handleUnhandledRejection(reason: any, promise: Promise<any>): void {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    
    logError(error, { 
      type: 'unhandled_rejection',
      timestamp: new Date().toISOString()
    });

    this.showErrorDialog({
      title: '应用程序警告',
      content: '检测到未处理的异步操作错误。',
      detail: `错误详情: ${error.message}\n\n这可能不会影响应用程序的正常使用，但建议报告此问题。`,
      type: 'warning',
      buttons: ['确定'],
      defaultId: 0
    }).catch(dialogError => {
      console.error('Failed to show unhandled rejection dialog:', dialogError);
      console.error('Original unhandled rejection:', error);
    });
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();