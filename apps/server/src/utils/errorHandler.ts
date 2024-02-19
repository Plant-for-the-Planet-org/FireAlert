import {logger} from '../server/logger';

class CustomError extends Error {
    statusCode: number;
    type: string;
    shouldLog: boolean;

    constructor(statusCode: number, message: string, type: string = 'GeneralError', shouldLog: boolean = false) {
        super(message);
        this.statusCode = statusCode;
        this.type = type;
        this.shouldLog = shouldLog;

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, CustomError);
        }

        // Automatically log
        this.logError();
    }

    logError(): void {
        console.error(`Error: ${this.type} - ${this.message}`);
        if (this.shouldLog) {
            // Use `this.message` to access the message property of the instance
            logger(`${this.message}`, "error");
        }
    }

    static throw(statusCode: number, message: string, type: string = 'GeneralError', shouldLog: boolean = false): void {
        const error = new CustomError(statusCode, message, type, shouldLog);
        throw error;
    }
}

export {CustomError};
