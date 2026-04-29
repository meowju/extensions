/**
 * Structured Logging Infrastructure
 * Provides consistent logging across the application with multiple output formats
 */

import { getConfig } from '../config/index.js';
import { existsSync, mkdirSync, appendFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

// Log levels with numeric values for filtering
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
};

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
  requestId?: string;
  userId?: string;
  duration?: number;
}

export interface LoggerOptions {
  context?: string;
  requestId?: string;
  userId?: string;
}

type LogFormatter = (entry: LogEntry) => string;

/**
 * Format log entry as JSON (production)
 */
const jsonFormatter: LogFormatter = (entry: LogEntry) => {
  return JSON.stringify({
    timestamp: entry.timestamp,
    level: entry.levelName,
    context: entry.context,
    message: entry.message,
    requestId: entry.requestId,
    userId: entry.userId,
    duration: entry.duration,
    data: entry.data,
    error: entry.error,
  });
};

/**
 * Format log entry as simple text (development)
 */
const simpleFormatter: LogFormatter = (entry: LogEntry) => {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.levelName}]`,
    entry.context ? `[${entry.context}]` : '',
    entry.message,
  ].filter(Boolean);

  let output = parts.join(' ');

  if (entry.data && Object.keys(entry.data).length > 0) {
    output += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
  }

  if (entry.error) {
    output += `\n  Error: ${entry.error.message}`;
    if (entry.error.stack) {
      output += `\n  Stack: ${entry.error.stack}`;
    }
  }

  if (entry.duration !== undefined) {
    output += ` (${entry.duration}ms)`;
  }

  return output;
};

/**
 * Format log entry as Apache combined format (for file logging)
 */
const combinedFormatter: LogFormatter = (entry: LogEntry) => {
  const context = entry.context || '-';
  const requestId = entry.requestId || '-';
  const userId = entry.userId || '-';
  const message = entry.message.replace(/"/g, '\\"');

  return `${entry.timestamp} ${context} ${requestId} ${userId} "${message}"`;
};

/**
 * Core Logger class
 */
export class Logger {
  private context: string;
  private logLevel: LogLevel;
  private format: LogFormatter;
  private enableFile: boolean;
  private enableConsole: boolean;
  private logFilePath: string;

  constructor(context: string = 'app') {
    this.context = context;

    // Load config lazily to avoid circular dependencies
    try {
      const cfg = getConfig();
      this.logLevel = LogLevel[cfg.LOG_LEVEL.toUpperCase() as keyof typeof LogLevel] ?? LogLevel.INFO;
      this.enableFile = cfg.LOG_ENABLE_FILE;
      this.enableConsole = cfg.LOG_ENABLE_CONSOLE;
      this.logFilePath = cfg.LOG_FILE_PATH;

      switch (cfg.LOG_FORMAT) {
        case 'json':
          this.format = jsonFormatter;
          break;
        case 'combined':
          this.format = combinedFormatter;
          break;
        default:
          this.format = simpleFormatter;
      }
    } catch {
      // Default values if config not yet loaded
      this.logLevel = LogLevel.INFO;
      this.format = simpleFormatter;
      this.enableFile = true;
      this.enableConsole = true;
      this.logFilePath = './logs/app.log';
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(childContext: string): Logger {
    const childLogger = new Logger(childContext);
    childLogger.logLevel = this.logLevel;
    childLogger.format = this.format;
    childLogger.enableFile = this.enableFile;
    childLogger.enableConsole = this.enableConsole;
    childLogger.logFilePath = this.logFilePath;
    return childLogger;
  }

  /**
   * Create a scoped logger for a specific request
   */
  withRequest(requestId: string, userId?: string): RequestLogger {
    return new RequestLogger(this, { requestId, userId });
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LOG_LEVEL_NAMES[level],
      message,
      context: this.context,
      data,
    };

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }

    const formatted = this.format(entry);

    // Console output
    if (this.enableConsole) {
      const colorCode = this.getColorCode(level);
      const resetCode = '\x1b[0m';
      console.log(`${colorCode}${formatted}${resetCode}`);
    }

    // File output
    if (this.enableFile) {
      this.writeToFile(formatted);
    }
  }

  private getColorCode(level: LogLevel): string {
    switch (level) {
      case LogLevel.TRACE:
        return '\x1b[90m'; // Gray
      case LogLevel.DEBUG:
        return '\x1b[36m'; // Cyan
      case LogLevel.INFO:
        return '\x1b[32m'; // Green
      case LogLevel.WARN:
        return '\x1b[33m'; // Yellow
      case LogLevel.ERROR:
        return '\x1b[31m'; // Red
      case LogLevel.FATAL:
        return '\x1b[35m'; // Magenta
      default:
        return '';
    }
  }

  private writeToFile(message: string): void {
    try {
      const dir = dirname(this.logFilePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      appendFileSync(this.logFilePath, message + '\n');
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }

  // Public logging methods
  trace(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.TRACE, message, data);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  fatal(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, data, error);
  }

  /**
   * Log timing information
   */
  timing(message: string, durationMs: number, data?: Record<string, unknown>): void {
    this.info(message, { ...data, duration: durationMs });
  }

  /**
   * Log method entry
   */
  enter(method: string, args?: Record<string, unknown>): void {
    this.debug(`→ ${method}`, args);
  }

  /**
   * Log method exit
   */
  exit(method: string, result?: unknown): void {
    this.debug(`← ${method}`, { result });
  }
}

/**
 * Request-scoped logger with additional context
 */
export class RequestLogger {
  private parent: Logger;
  private requestId: string;
  private userId?: string;

  constructor(parent: Logger, options: { requestId: string; userId?: string }) {
    this.parent = parent;
    this.requestId = options.requestId;
    this.userId = options.userId;
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LOG_LEVEL_NAMES[level],
      message,
      context: this.parent['context'],
      requestId: this.requestId,
      userId: this.userId,
      data,
    };

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }

    const formatted = this.parent['format'](entry);

    if (this.parent['enableConsole']) {
      const colorCode = this.parent['getColorCode'](level);
      const resetCode = '\x1b[0m';
      console.log(`${colorCode}${formatted}${resetCode}`);
    }

    if (this.parent['enableFile']) {
      try {
        appendFileSync(this.parent['logFilePath'], formatted + '\n');
      } catch (err) {
        console.error('Failed to write to log file:', err);
      }
    }
  }

  trace(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.TRACE, message, data);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  timing(message: string, durationMs: number, data?: Record<string, unknown>): void {
    this.info(message, { ...data, duration: durationMs });
  }
}

// Create default logger instance
export const logger = new Logger('app');

// Export convenience functions
export const createLogger = (context: string) => new Logger(context);
export const log = logger;
