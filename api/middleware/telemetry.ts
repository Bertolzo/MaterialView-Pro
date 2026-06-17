import { Request, Response, NextFunction } from 'express';
// Assuming @middleware/node and @opentelemetry/api as per PRD
// import middleware from '@middleware/node';
// import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import crypto from 'crypto';

export const telemetryMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const startTime = process.hrtime();
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();

    // Injeta o requestId no request para uso posterior
    req.headers['x-request-id'] = requestId;

    // TODO: Initialize OpenTelemetry span here
    // const tracer = trace.getTracer('prv-backend');
    // const span = tracer.startSpan(`HTTP ${req.method} ${req.path}`);
    // span.setAttribute('http.method', req.method);
    // span.setAttribute('http.route', req.path);
    // span.setAttribute('request.id', requestId as string);

    // Logs no console no ambiente de dev
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Telemetry] 📡 Start ${req.method} ${req.url} | Request ID: ${requestId}`);
    }

    // Intercepta o término da requisição
    const originalEnd = res.end;
    const originalSend = res.send;

    // Sobrescreve send/end para capturar o fim da requisição
    res.end = function (chunk?: any, encoding?: any, cb?: any) {
        res.end = originalEnd;
        res.end(chunk, encoding, cb);
        finishTelemetry();
    } as any;

    const finishTelemetry = () => {
        const diff = process.hrtime(startTime);
        const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

        const statusCode = res.statusCode;
        const isError = statusCode >= 400;

        if (process.env.NODE_ENV === 'development') {
            const logColor = isError ? '\x1b[31m' : '\x1b[32m'; // Red for error, Green for success
            console.log(`[Telemetry] 🏁 End ${req.method} ${req.url} | ${logColor}${statusCode}\x1b[0m | ${durationMs}ms | Request ID: ${requestId}`);
        }

        // Export metrics via OpenTelemetry / Middleware SDK
        // if (span) {
        //     span.setAttribute('http.status_code', statusCode);
        //     span.setAttribute('http.duration_ms', durationMs);
        //     if (isError) {
        //         span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${statusCode}` });
        //     } else {
        //         span.setStatus({ code: SpanStatusCode.OK });
        //     }
        //     span.end();
        // }
    };

    next();
};
