import React from 'react';
import { CheckCircle, XCircle, PlayCircle, Loader2 } from 'lucide-react';

interface TimelineEvent {
    id: number;
    agent_id: string;
    status: string;
    task: string;
    created_at: string;
}

export function AgentTimeline({ events }: { events: TimelineEvent[] }) {
    const getIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />;
            case 'failed': return <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
            case 'started': return <PlayCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />;
            case 'processing': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />;
            default: return <CheckCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />;
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
            <h3 className="font-bold text-gray-800 text-lg mb-6 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                Activity Timeline
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-0 relative custom-scrollbar">
                {events.map((event, index) => (
                    <div key={event.id} className="flex gap-4 relative">
                        <div className="flex flex-col items-center">
                            <div className="bg-white z-10 py-1">
                                {getIcon(event.status)}
                            </div>
                            {index !== events.length - 1 && (
                                <div className="w-[2px] bg-gradient-to-b from-gray-200 to-transparent h-full mt-1"></div>
                            )}
                        </div>
                        <div className="pb-6 flex-1 pt-1">
                            <div className="flex justify-between items-start mb-1">
                                <p className="font-bold text-gray-800 text-sm">{event.agent_id}</p>
                                <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                                    {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 leading-snug">{event.task}</p>
                            <div className="mt-2 inline-block">
                                <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md bg-gray-50 text-gray-500 border border-gray-100`}>
                                    {event.status}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
                {events.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-50">
                        <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center mb-3">
                            <Loader2 className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">Waiting for events...</p>
                    </div>
                )}
            </div>
            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e5e7eb; border-radius: 20px; }
      `}</style>
        </div>
    );
}
