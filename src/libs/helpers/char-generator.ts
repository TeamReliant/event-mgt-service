import { randomInt } from 'crypto';
import * as moment from 'moment-timezone';
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

export function mapToIanaTimezone(offset: string): string {
  const now = new Date();

  // Convert offset like "UTC+1" to number of minutes
  const offsetMinutes = parseOffsetToMinutes(offset);

  // Get list of all timezones
  const timezones = moment.tz.names();

  // Filter timezones that match the offset *right now* (considering DST)
  const matching = timezones.filter((tz) => {
    const tzOffset = moment.tz(now, tz).utcOffset(); // in minutes
    return tzOffset === offsetMinutes;
  });

  // Return the first match, or fallback
  return matching.length > 0 ? matching[0] : 'Etc/UTC';
}

function parseOffsetToMinutes(offsetStr: string): number {
  const match = offsetStr.match(/^UTC([+-])(\d{1,2})$/);
  if (!match) throw new Error(`Invalid offset format: ${offsetStr}`);
  const sign = match[1] === '+' ? 1 : -1;
  const hours = parseInt(match[2], 10);
  return sign * hours * 60;
}

export function getOffsetSuffix(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value;
    return offset?.replace('GMT', '') || '+00:00';
  } catch {
    return '+00:00';
  }
}
