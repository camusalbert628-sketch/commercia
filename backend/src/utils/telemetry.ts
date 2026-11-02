import { Request, Response, NextFunction } from 'express';

export interface RequestMetric {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip: string;
}

export interface EndpointStat {
  path: string;
  method: string;
  totalCalls: number;
  avgDurationMs: number;
  errors4xx: number;
  errors5xx: number;
}

class TelemetryService {
  private startTime: number = Date.now();
  private totalRequests: number = 0;
  private totalSuccess2xx: number = 0;
  private totalRedirect3xx: number = 0;
  private totalErrors4xx: number = 0;
  private totalErrors5xx: number = 0;
  private totalDurationMs: number = 0;
  
  // Historique glissant des 100 dernières requêtes
  private recentRequests: RequestMetric[] = [];
  private endpointMap: Map<string, { calls: number; totalDuration: number; err4xx: number; err5xx: number }> = new Map();

  public recordRequest(req: Request, res: Response, durationMs: number) {
    this.totalRequests++;
    this.totalDurationMs += durationMs;

    const status = res.statusCode;
    if (status >= 200 && status < 300) this.totalSuccess2xx++;
    else if (status >= 300 && status < 400) this.totalRedirect3xx++;
    else if (status >= 400 && status < 500) this.totalErrors4xx++;
    else if (status >= 500) this.totalErrors5xx++;

    const metric: RequestMetric = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: status,
      durationMs: Math.round(durationMs * 10) / 10,
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
    };

    this.recentRequests.unshift(metric);
    if (this.recentRequests.length > 100) {
      this.recentRequests.pop();
    }

    // Regrouper par endpoint
    const endpointKey = `${req.method} ${req.baseUrl || req.path}`;
    const current = this.endpointMap.get(endpointKey) || { calls: 0, totalDuration: 0, err4xx: 0, err5xx: 0 };
    current.calls++;
    current.totalDuration += durationMs;
    if (status >= 400 && status < 500) current.err4xx++;
    if (status >= 500) current.err5xx++;
    this.endpointMap.set(endpointKey, current);
  }

  public getSummary() {
    const avgLatency = this.totalRequests > 0 ? Math.round(this.totalDurationMs / this.totalRequests) : 0;
    const errorRate = this.totalRequests > 0 
      ? Math.round(((this.totalErrors4xx + this.totalErrors5xx) / this.totalRequests) * 1000) / 10 
      : 0;

    const endpoints: EndpointStat[] = Array.from(this.endpointMap.entries()).map(([key, data]) => {
      const [method, ...pathParts] = key.split(' ');
      return {
        path: pathParts.join(' '),
        method,
        totalCalls: data.calls,
        avgDurationMs: Math.round(data.totalDuration / data.calls),
        errors4xx: data.err4xx,
        errors5xx: data.err5xx,
      };
    }).sort((a, b) => b.totalCalls - a.totalCalls).slice(0, 15);

    // Latences percentiles sur les requêtes récentes
    const latencies = this.recentRequests.map(r => r.durationMs).sort((a, b) => a - b);
    const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
    const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;

    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();

    return {
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      totalRequests: this.totalRequests,
      success2xx: this.totalSuccess2xx,
      redirect3xx: this.totalRedirect3xx,
      errors4xx: this.totalErrors4xx,
      errors5xx: this.totalErrors5xx,
      errorRatePercent: errorRate,
      avgLatencyMs: avgLatency,
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      memory: {
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        externalMb: Math.round(memory.external / 1024 / 1024),
      },
      cpu: {
        userMicroseconds: cpu.user,
        systemMicroseconds: cpu.system,
      },
      endpoints,
      recentRequests: this.recentRequests.slice(0, 30),
    };
  }
}

export const telemetry = new TelemetryService();

/**
 * Middleware Express pour intercepter et mesurer la durée de chaque requête HTTP
 */
export const telemetryMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationMs = diff[0] * 1000 + diff[1] / 1e6;
    telemetry.recordRequest(req, res, durationMs);
  });

  next();
};
