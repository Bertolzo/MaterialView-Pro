import { Router } from 'express';
import { db } from './lib/db';

export const agentLogRouter = Router();

agentLogRouter.post('/agent-log', async (req, res, next) => {
    try {
        const { agent_id, status, task, tokens_used, duration_ms, details } = req.body;

        if (!agent_id || !status) {
            return res.status(400).json({ error: 'agent_id and status are required' });
        }

        const client = await db.connect();
        try {
            const result = await client.query(
                `INSERT INTO agent_logs (agent_id, status, task, tokens_used, duration_ms, details)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [agent_id, status, task, tokens_used || 0, duration_ms || 0, details || {}]
            );
            res.status(201).json({ success: true, log: result.rows[0] });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error inserting agent log:', error);
        next(error);
    }
});
