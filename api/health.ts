import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.status(200).json({
    status: "ok",
    service: "PisosRealView Bridge",
    runtime: "vercel-serverless",
    version: "1.0.0",
    selfAuditEnabled: process.env.ENABLE_SELF_AUDIT === 'true'
  });
}
