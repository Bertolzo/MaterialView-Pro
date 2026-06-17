import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface MetricsData {
    total_tasks: string | number;
    total_tokens: string | number;
    avg_duration: string | number;
    failed_tasks: string | number;
}

export function AgentMetrics({ metrics }: { metrics: MetricsData | null }) {
    if (!metrics) return null;

    const total = Number(metrics.total_tasks) || 0;
    const failed = Number(metrics.failed_tasks) || 0;
    const tokens = Number(metrics.total_tokens) || 0;
    const avgDur = Number(metrics.avg_duration) || 0;

    const successRate = total > 0
        ? Math.round(((total - failed) / total) * 100)
        : 100;

    // Mock data for the chart, ideally this would come from the API
    const chartData = [
        { name: 'Completed', value: total - failed, color: '#10b981' },
        { name: 'Failed', value: failed, color: '#ef4444' }
    ];

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
            <h3 className="font-bold text-gray-800 text-lg mb-6">System Metrics</h3>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100/50">
                    <p className="text-xs text-blue-800/60 font-bold uppercase tracking-wider mb-1">Total Tasks</p>
                    <p className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        {total}
                    </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Success Rate</p>
                    <p className="text-3xl font-black text-gray-800">{successRate}%</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Avg Time</p>
                    <p className="text-3xl font-black text-gray-800 flex items-baseline gap-1">
                        {Math.round(avgDur)}<span className="text-sm text-gray-400 font-medium">ms</span>
                    </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Tokens</p>
                    <p className="text-3xl font-black text-gray-800 font-mono tracking-tight">{tokens.toLocaleString()}</p>
                </div>
            </div>

            <div className="flex-1 min-h-[160px] relative">
                <div className="absolute inset-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#6b7280', fontWeight: 500 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }} />
                            <Tooltip
                                cursor={{ fill: '#f9fafb' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', fontWeight: 600, padding: '8px 16px' }}
                                itemStyle={{ color: '#1f2937' }}
                            />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
