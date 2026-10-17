import type { Response } from 'express';
import { API_PREFIX } from '../constants/app.constants.js';

export const TOTAL_COUNT_HEADER = 'X-Total-Count';

/** `201 Created` → `Location: /api/<resourcePath>/<id>`. */
export function setLocation(response: Response, resourcePath: string, id: string): void {
  response.setHeader('Location', `/${API_PREFIX}/${resourcePath}/${id}`);
}

/** Number of items in a list response (lists are returned as bare JSON arrays). */
export function setTotalCount(response: Response, count: number): void {
  response.setHeader(TOTAL_COUNT_HEADER, String(count));
}
