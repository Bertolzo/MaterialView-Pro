// pages/Dashboard.tsx - Placeholder funcional
import React from 'react';

export const Dashboard = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Dashboard PisosRealView (Placeholder)
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-700">Analytics</h3>
          <p className="text-gray-600 mt-2">Em desenvolvimento</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-700">Processing Queue</h3>
          <p className="text-gray-600 mt-2">Em desenvolvimento</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-700">System Status</h3>
          <p className="text-gray-600 mt-2">✅ Servidor rodando</p>
        </div>
      </div>
    </div>
  );
};