/**
 * Log level enumeration
 */
export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  logLevel: LogLevel;
  logToConsole: boolean;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  logLevel: LogLevel.INFO,
  logToConsole: true,
};

/**
 * Twitter API logger
 */
export class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Format log message
   */
  private formatMessage(
    level: LogLevel,
    module: string,
    message: string,
    data?: any
  ): string {
    const timestamp = new Date().toISOString();
    const dataString = data ? ` | ${JSON.stringify(data)}` : "";
    return `[${timestamp}] [${level}] [${module}] ${message}${dataString}`;
  }

  /**
   * Determine if a specific log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
    ];
    const configIndex = levels.indexOf(this.config.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= configIndex;
  }

  /**
   * Log debug level message
   */
  debug(module: string, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const logMessage = this.formatMessage(
        LogLevel.DEBUG,
        module,
        message,
        data
      );
      if (this.config.logToConsole) {
        console.debug(logMessage);
      }
    }
  }

  /**
   * Log info level message
   */
  info(module: string, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const logMessage = this.formatMessage(
        LogLevel.INFO,
        module,
        message,
        data
      );
      if (this.config.logToConsole) {
        console.info(logMessage);
      }
    }
  }

  /**
   * Log warning level message
   */
  warn(module: string, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const logMessage = this.formatMessage(
        LogLevel.WARN,
        module,
        message,
        data
      );
      if (this.config.logToConsole) {
        console.warn(logMessage);
      }
    }
  }

  /**
   * Log error level message
   */
  error(module: string, message: string, error?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorData =
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error;

      const logMessage = this.formatMessage(
        LogLevel.ERROR,
        module,
        message,
        errorData
      );
      if (this.config.logToConsole) {
        console.error(logMessage);
      }
    }
  }

  /**
   * Log API request
   */
  logRequest(
    module: string,
    method: string,
    url: string,
    headers?: any,
    body?: any
  ): void {
    this.info(module, `API Request: ${method} ${url}`, { headers, body });
  }

  /**
   * Log API response
   */
  logResponse(
    module: string,
    method: string,
    url: string,
    status: number,
    data?: any
  ): void {
    this.info(
      module,
      `API Response: ${method} ${url} - Status: ${status}`,
      data
    );
  }

  /**
   * Log API error
   */
  logApiError(module: string, method: string, url: string, error: any): void {
    this.error(module, `API Error: ${method} ${url}`, error);
  }

  /**
   * Log performance timing
   */
  logPerformance(module: string, operation: string, startTime: number): void {
    const duration = Date.now() - startTime;
    this.debug(module, `Performance: ${operation} took ${duration}ms`);
  }
}

// Create default logger instance
export const defaultLogger = new Logger();
