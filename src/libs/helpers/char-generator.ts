import { randomInt } from 'crypto';

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
