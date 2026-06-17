import React from 'react';
import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react';

interface AgentCardProps {
    agent: {
        agent_id: string;
        status: string;
        task: string;
        duration_ms: number;
        tokens_used: number;
    };
}

export function AgentCard({ agent }: AgentCardProps) {
    const Icon = agent.status === 'completed' ? CheckCircle :
        agent.status === 'failed' ? XCircle :
            agent.status === 'started' || agent.status === 'processing' ? Activity : Clock;

    const colorClass = agent.status === 'completed' ? 'text-green-500' :
        agent.status === 'failed' ? 'text-red-500' :
            'text-blue-500';

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-1 h-full ${agent.status === 'completed' ? 'bg-green-500' : agent.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'}`}></div>

            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 text-lg flex-1 truncate pr-2">{agent.agent_id}</h3>
                <Icon className={`w-6 h-6 ${colorClass}`} />
            </div>

            <div className="space-y-3 text-sm text-gray-600 border-t border-gray-50 pt-4">
                <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-400">Status</span>
                    <span className={`capitalize font-bold px-2 py-0.5 rounded-md ${agent.status === 'completed' ? 'bg-green-50 text-green-700' : agent.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                        {agent.status}
                    </span>
                </div>

                <div className="flex justify-between items-center group-hover:bg-gray-50 -mx-2 px-2 py-1 rounded transition-colors">
                    <span className="font-medium text-gray-400">Current Task</span>
                    <span className="truncate max-w-[140px] font-medium text-gray-700" title={agent.task}>{agent.task || 'Idle'}</span>
                </div>

                <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-400">Last Duration</span>
                    <span className="font-mono text-gray-700 font-medium">{agent.duration_ms ? `${agent.duration_ms}ms` : '-'}</span>
                </div>

                <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-400">Tokens Used</span>
                    <span className="font-mono text-gray-700 font-medium bg-gray-100 px-2 py-0.5 rounded-md">{agent.tokens_used || 0}</span>
                </div>
            </div>
        </div>
    );
}
