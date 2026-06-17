import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  analysisController,
  analysisControllerConfig as config
} from '../src/domains/rendering/interface/http/index.js';

export { config };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return analysisController(req, res);
}
