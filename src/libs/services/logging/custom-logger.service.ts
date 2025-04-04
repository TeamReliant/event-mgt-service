import { Injectable, LoggerService } from '@nestjs/common';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as console from 'node:console';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private logDir = 'logs';
  private logFilePrefix = this.getCurrentDate();
  private logFile = this.getLatestLogFile();
  private maxLines = 5000;
  private currentLineCount = this.getLineCount();

  constructor() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir);
    }
  }

  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
  }

  private getLatestLogFile(): string {
    const files = fs
      .readdirSync(this.logDir)
      .filter((file) => file.startsWith(this.logFilePrefix)) // Get only today's logs
      .sort(); // Ensure files are in order

    return files.length
      ? files[files.length - 1]
      : `${this.logFilePrefix}(01).log`; // Get last file or start new
  }

  private getLineCount(): number {
    const filePath = path.join(this.logDir, this.logFile);
    if (!fs.existsSync(filePath)) return 0; // If file doesn’t exist, start fresh
    return fs.readFileSync(filePath, 'utf8').split('\n').length;
  }

  private rotateLogFile() {
    let index = 1;
    let newFileName: string;

    do {
      index++;
      newFileName = `${this.logFilePrefix}(${index.toString().padStart(2, '0')}).log`;
    } while (fs.existsSync(path.join(this.logDir, newFileName)));

    this.logFile = newFileName;
    this.currentLineCount = 0; // Reset counter
  }

  private writeToFile(level: string, message: string) {
    if (this.currentLineCount >= this.maxLines) {
      this.rotateLogFile();
    }

    const logMessage = `${new Date().toISOString()} - ${level}: ${message}\n`;
    const filePath = path.join(this.logDir, this.logFile);
    fs.appendFileSync(filePath, logMessage, 'utf8');
    this.currentLineCount++;
  }

  log(message: string) {
    this.writeToFile('INFO', message);
  }

  warn(message: string) {
    console.warn(message);
    this.writeToFile('WARNING', `WARNING: ${message}`);
  }

  error(message: string) {
    this.writeToFile('ERROR', message);
  }
}
