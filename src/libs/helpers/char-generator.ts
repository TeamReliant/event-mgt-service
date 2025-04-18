import { randomInt } from 'crypto';
import { NotAcceptableException } from '@nestjs/common';

export const generateSixDigitToken = () => {
  const token = randomInt(100000, 999999);
  const tokenString = token.toString();

  if (tokenString.length != 6) {
    return generateSixDigitToken();
  }

  return token;
};

// a function that generates random 100 alphabets mixed with numbers
export const generateRandomString = (length: number) => {
  const chars =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = length; i > 0; --i) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

export function parseTimezoneOffset(timezone: string): number {
  const match = timezone.match(/^UTC([+-])(\d{2}):(\d{2})$/);
  if (!match)
    throw new Error('Invalid timezone format. Expected format: UTC±HH:mm');

  const [, sign, hours, minutes] = match;
  const totalMinutes = parseInt(hours, 10) * 60 + parseInt(minutes, 10);
  return sign === '+' ? totalMinutes : -totalMinutes;
}

export function convertOffsetToPostgresTZ(offset: string): string {
  const match = offset.match(/^UTC([+-]\d{2}):(\d{2})$/);
  if (!match) throw new NotAcceptableException('Invalid timezone format');

  return `${match[1]}:${match[2]}`;
}
