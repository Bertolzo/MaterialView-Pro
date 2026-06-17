// backend/routes/analyze.js
import { Router } from 'express';
import { analyzeRoom } from '../services/ai/roomAnalyzer.js';
import { apiKeyMiddleware } from '../middleware/apiKey.js';
import { log } from '../services/gateway/logger.js';

const router = Router();

// Autenticação por API key
router.use(apiKeyMiddleware);

router.post('/', async (req, res, next) => {
  const clientId = req.client?.clientId || 'anonymous';
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: "O campo 'imageBase64' é obrigatório e deve ser uma string base64 válida.",
      });
    }

    const context = await analyzeRoom(imageBase64);
    log('info', 'analyze', 'room_analyzed', { clientId });
    return res.status(200).json(context);
  } catch (err) {
    log('error', 'analyze', 'analyze_error', { clientId, error: err.message });
    next(err);
  }
});

export default router;
