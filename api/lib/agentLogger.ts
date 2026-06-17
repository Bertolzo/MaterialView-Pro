import { db } from './db.js';

export interface AgentLogParams {
    agent_id: string;
    status: 'started' | 'processing' | 'completed' | 'failed';
    task: string;
    tokens_used?: number;
    duration_ms?: number;
    details?: Record<string, any>;
}

/**
 * Log agent activity directly to the database.
 * Use this in backend services like geminiService.server.ts.
 */
export async function logAgentActivity(params: AgentLogParams) {
    try {
        const client = await db.connect();
        try {
            await client.query(
                `INSERT INTO agent_logs (agent_id, status, task, tokens_used, duration_ms, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [params.agent_id, params.status, params.task, params.tokens_used || 0, params.duration_ms || 0, params.details || {}]
            );
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Failed to log agent activity:', error);
        // Don't throw to prevent crashing the main application flow
    }
}
