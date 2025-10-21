// Utility functions for HOA Community Platform

import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { VALIDATION_PATTERNS, SECURITY } from '../constants';

export class ValidationUtils {
  static isValidEmail(email: string): boolean {
    return VALIDATION_PATTERNS.EMAIL.test(email);
  }

  static isValidPhone(phone: string): boolean {
    return VALIDATION_PATTERNS.PHONE.test(phone);
  }

  static isValidPassword(password: string): boolean {
    return (
      password.length >= SECURITY.PASSWORD_MIN_LENGTH &&
      password.length <= SECURITY.PASSWORD_MAX_LENGTH &&
      VALIDATION_PATTERNS.PASSWORD.test(password)
    );
  }

  static isValidLicensePlate(licensePlate: string): boolean {
    return VALIDATION_PATTERNS.LICENSE_PLATE.test(licensePlate.toUpperCase());
  }

  static isValidUuid(uuid: string): boolean {
    return VALIDATION_PATTERNS.UUID.test(uuid);
  }

  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }
}

export class SecurityUtils {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SECURITY.BCRYPT_ROUNDS);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static generateUuid(): string {
    return crypto.randomUUID();
  }

  static generateMfaSecret(): string {
    return crypto.randomBytes(20).toString('base64');
  }

  static extractIpAddress(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      '127.0.0.1'
    );
  }

  static extractUserAgent(request: any): string {
    return request.headers['user-agent'] || 'Unknown';
  }
}

export class DateUtils {
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  static addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  static addMinutes(date: Date, minutes: number): Date {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }

  static isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
    return date >= startDate && date <= endDate;
  }

  static isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  static isPastDate(date: Date): boolean {
    return date < new Date();
  }

  static isFutureDate(date: Date): boolean {
    return date > new Date();
  }

  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  static formatDateTime(date: Date): string {
    return date.toISOString();
  }
}

export class StringUtils {
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  static capitalizeWords(str: string): string {
    return str.split(' ').map(word => this.capitalize(word)).join(' ');
  }

  static camelCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  }

  static snakeCase(str: string): string {
    return str
      .replace(/\W+/g, ' ')
      .split(/ |\B(?=[A-Z])/)
      .map(word => word.toLowerCase())
      .join('_');
  }

  static kebabCase(str: string): string {
    return str
      .replace(/\W+/g, ' ')
      .split(/ |\B(?=[A-Z])/)
      .map(word => word.toLowerCase())
      .join('-');
  }

  static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static truncate(str: string, maxLength: number, suffix = '...'): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength - suffix.length) + suffix;
  }
}

export class ArrayUtils {
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  static unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  }

  static uniqueBy<T>(array: T[], key: keyof T): T[] {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }

  static groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  static sortBy<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
    return [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }
}

export class ObjectUtils {
  static omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
  }

  static pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  }

  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }
    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as any;
    }
    if (typeof obj === 'object') {
      const cloned = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }
    return obj;
  }

  static isEmpty(obj: any): boolean {
    if (obj == null) return true;
    if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  }
}

export class PaginationUtils {
  static calculatePagination(
    page: number,
    limit: number,
    total: number
  ): {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    offset: number;
    has_next: boolean;
    has_prev: boolean;
  } {
    const total_pages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    return {
      page,
      limit,
      total,
      total_pages,
      offset,
      has_next: page < total_pages,
      has_prev: page > 1,
    };
  }

  static createPaginationLinks(
    base_url: string,
    page: number,
    limit: number,
    total_pages: number
  ): {
    first: string;
    last: string;
    prev?: string;
    next?: string;
  } {
    const links = {
      first: `${base_url}?page=1&limit=${limit}`,
      last: `${base_url}?page=${total_pages}&limit=${limit}`,
    };

    if (page > 1) {
      links.prev = `${base_url}?page=${page - 1}&limit=${limit}`;
    }

    if (page < total_pages) {
      links.next = `${base_url}?page=${page + 1}&limit=${limit}`;
    }

    return links;
  }
}

export class FileUtils {
  static getFileExtension(filename: string): string {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
  }

  static isValidFileType(filename: string, allowedTypes: string[]): boolean {
    const extension = this.getFileExtension(filename).toLowerCase();
    return allowedTypes.includes(extension);
  }

  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  static generateUniqueFilename(originalname: string): string {
    const extension = this.getFileExtension(originalname);
    const timestamp = Date.now();
    const random = StringUtils.generateRandomString(8);
    return `${timestamp}_${random}.${extension}`;
  }
}