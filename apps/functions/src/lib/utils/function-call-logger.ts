// apps/functions/src/lib/utils/function-call-logger.ts
import { admin } from './admin';

const { db } = admin();

interface LogEntry {
  level: 'info' | 'debug' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  data?: any;
}

interface FunctionLog {
  functionName: string;
  status: 'running' | 'success' | 'error';
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  request?: any;
  response?: any;
  logs: LogEntry[];
  error?: string;
  userId?: string;
  adminId?: string;
  metadata?: any;
}

/**
 * Sensitive fields that should be redacted from logs
 */
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'apiKey', 'fcmToken'];

/**
 * Remove undefined values from an object (Firestore doesn't allow undefined)
 */
function removeUndefined(obj: any): any {
  if (obj === undefined) {
    return null;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter(item => item !== undefined);
  }

  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = removeUndefined(value);
    }
  }
  return cleaned;
}

/**
 * Redact sensitive data from an object
 */
function redactSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export class FunctionCallLogger {
  private logId: string | null = null;
  private log: FunctionLog;
  private isCompleted = false;

  constructor(functionName: string) {
    this.log = {
      functionName,
      status: 'running',
      startTime: new Date(),
      logs: [],
    };
  }

  /**
   * Start logging - creates the log document in Firestore
   */
  async start(options?: {
    request?: any;
    userId?: string;
    adminId?: string;
    metadata?: any;
  }): Promise<string> {
    this.log.startTime = new Date();
    this.log.status = 'running';
    
    // Only set fields if they have values (avoid undefined)
    if (options?.request) {
      this.log.request = removeUndefined(redactSensitiveData(options.request));
    }
    if (options?.userId) {
      this.log.userId = options.userId;
    }
    if (options?.adminId) {
      this.log.adminId = options.adminId;
    }
    if (options?.metadata) {
      this.log.metadata = options.metadata;
    }

    // Add initial log entry
    this.log.logs.push({
      level: 'info',
      message: `Function ${this.log.functionName} started`,
      timestamp: new Date(),
    });

    // Create document in Firestore
    const docRef = db.collection('functionLogs').doc();
    this.logId = docRef.id;

    // Save initial log (remove undefined values)
    const logToSave = removeUndefined({
      ...this.log,
      startTime: this.log.startTime,
    });
    await docRef.set(logToSave);

    return this.logId;
  }

  /**
   * Log an informational message
   */
  info(message: string, data?: any): void {
    const logEntry: any = {
      level: 'info',
      message,
      timestamp: new Date(),
    };
    if (data !== undefined) {
      // Redact sensitive data and remove undefined values
      logEntry.data = removeUndefined(redactSensitiveData(data));
    }
    this.log.logs.push(logEntry);
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: any): void {
    if (process.env['DEBUG'] === 'true') {
      const logEntry: any = {
        level: 'debug',
        message,
        timestamp: new Date(),
      };
      if (data !== undefined) {
        // Redact sensitive data and remove undefined values
        logEntry.data = removeUndefined(redactSensitiveData(data));
      }
      this.log.logs.push(logEntry);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: any): void {
    const logEntry: any = {
      level: 'warn',
      message,
      timestamp: new Date(),
    };
    if (data !== undefined) {
      // Redact sensitive data and remove undefined values
      logEntry.data = removeUndefined(redactSensitiveData(data));
    }
    this.log.logs.push(logEntry);
  }

  /**
   * Log an error message
   */
  error(message: string, data?: any): void {
    const logEntry: any = {
      level: 'error',
      message,
      timestamp: new Date(),
    };
    if (data !== undefined) {
      // Redact sensitive data and remove undefined values
      logEntry.data = removeUndefined(redactSensitiveData(data));
    }
    this.log.logs.push(logEntry);
  }

  /**
   * Mark function as successful
   */
  async success(response?: any): Promise<void> {
    if (this.isCompleted) return;

    this.log.status = 'success';
    this.log.endTime = new Date();
    this.log.duration = this.log.endTime.getTime() - this.log.startTime.getTime();
    
    if (response !== undefined) {
      this.log.response = removeUndefined(redactSensitiveData(response));
    }

    this.log.logs.push({
      level: 'info',
      message: `Function ${this.log.functionName} completed successfully`,
      timestamp: new Date(),
    });

    await this.saveLog();
    this.isCompleted = true;
  }

  /**
   * Mark function as failed
   */
  async fail(error: Error | string, response?: any): Promise<void> {
    if (this.isCompleted) return;

    this.log.status = 'error';
    this.log.endTime = new Date();
    this.log.duration = this.log.endTime.getTime() - this.log.startTime.getTime();
    this.log.error = error instanceof Error ? error.message : error;
    
    if (response !== undefined) {
      this.log.response = removeUndefined(redactSensitiveData(response));
    }

    const errorLogEntry: any = {
      level: 'error',
      message: `Function ${this.log.functionName} failed: ${this.log.error}`,
      timestamp: new Date(),
    };
    
    if (error instanceof Error && error.stack) {
      errorLogEntry.data = removeUndefined({ stack: error.stack });
    }
    
    this.log.logs.push(errorLogEntry);

    await this.saveLog();
    this.isCompleted = true;
  }

  /**
   * Ensure log is completed (call in finally block)
   */
  async ensureCompleted(status?: 'success' | 'error', response?: any, errorMessage?: string): Promise<void> {
    if (this.isCompleted) return;

    if (status === 'error' || errorMessage) {
      await this.fail(errorMessage || 'Function terminated unexpectedly', response);
    } else if (status === 'success' || this.log.status === 'running') {
      await this.success(response);
    }
  }

  /**
   * Get the log document ID
   */
  getLogId(): string | null {
    return this.logId;
  }

  /**
   * Check if log is completed
   */
  isLogCompleted(): boolean {
    return this.isCompleted;
  }

  /**
   * Save log to Firestore
   */
  private async saveLog(): Promise<void> {
    if (!this.logId) {
      // If no logId, create one
      const docRef = db.collection('functionLogs').doc();
      this.logId = docRef.id;
    }

    // Remove all undefined values before saving (Firestore doesn't allow undefined)
    const logToSave = removeUndefined({
      ...this.log,
      startTime: this.log.startTime,
      endTime: this.log.endTime,
    });

    const docRef = db.collection('functionLogs').doc(this.logId);
    await docRef.set(logToSave);
  }
}
