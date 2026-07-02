import { pino } from 'pino';
import { config } from './config.js';

export const logger = pino(
  config.env === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : { level: config.env === 'test' ? 'silent' : 'info' },
);
