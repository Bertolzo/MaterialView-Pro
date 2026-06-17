import { Router } from 'express';
import { db } from './lib/db';

export const dashboardRouter = Router();

// GET /api/dashboard/agents (Latest status per agent)
dashboardRouter.get('/agents', async (req, res, next) => {
    try {
        const client = await db.connect();
        try {
            // Get the latest log for each agent
            const result = await client.query(`
                SELECT DISTINCT ON (agent_id)
                    id, agent_id, status, task, tokens_used, duration_ms, created_at
                FROM agent_logs
                ORDER BY agent_id, created_at DESC
            `);
            res.json({ agents: result.rows });
        } finally {
            client.release();
        }
    } catch (error) {
        next(error);
    }
});

// GET /api/dashboard/timeline (Recent activity)
dashboardRouter.get('/timeline', async (req, res, next) => {
    try {
        const client = await db.connect();
        try {
            const limit = parseInt(req.query.limit as string) || 50;
            const result = await client.query(`
                SELECT id, agent_id, status, task, created_at
                FROM agent_logs
                ORDER BY created_at DESC
                LIMIT $1
            `, [limit]);
            res.json({ timeline: result.rows });
        } finally {
            client.release();
        }
    } catch (error) {
        next(error);
    }
});

// GET /api/dashboard/metrics (Aggregate metrics)
dashboardRouter.get('/metrics', async (req, res, next) => {
    try {
        const client = await db.connect();
        try {
            const result = await client.query(`
                SELECT 
                    COUNT(*) as total_tasks,
                    SUM(tokens_used) as total_tokens,
                    AVG(duration_ms) as avg_duration,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tasks
                FROM agent_logs
            `);
            res.json({ metrics: result.rows[0] });
        } finally {
            client.release();
        }
    } catch (error) {
        next(error);
    }
});
