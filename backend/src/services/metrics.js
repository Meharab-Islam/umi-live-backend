import '../config/env.js';
import client from 'prom-client';

/**
 * Prometheus metrics. Scrape GET /metrics (protected, see server.js).
 * Default process metrics include event-loop lag, heap, GC and CPU - the first things to watch
 * when the Node process is the bottleneck.
 */
const register = new client.Registry();
register.setDefaultLabels({
  app: process.env.PROJECT_NAME || 'umi',
  instance: process.env.INSTANCE_ID || process.env.NODE_APP_INSTANCE || String(process.pid),
});
client.collectDefaultMetrics({ register });

export const metrics = {
  register,
  httpDuration: new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [register],
  }),
  rateLimited: new client.Counter({
    name: 'rate_limited_total',
    help: 'Requests / events rejected by a rate limiter',
    labelNames: ['limiter'],
    registers: [register],
  }),
  socketEventsIn: new client.Counter({
    name: 'socket_events_in_total',
    help: 'Socket.IO events received from clients',
    labelNames: ['event'],
    registers: [register],
  }),
  socketDropped: new client.Counter({
    name: 'socket_events_dropped_total',
    help: 'Socket events dropped by per-socket limits',
    labelNames: ['event'],
    registers: [register],
  }),
  socketConnections: new client.Gauge({
    name: 'socket_connections',
    help: 'Currently connected Socket.IO clients on this process',
    registers: [register],
  }),
  socketRooms: new client.Gauge({
    name: 'socket_rooms',
    help: 'Socket.IO rooms on this process',
    registers: [register],
  }),
};

/** Express middleware: records duration by *route pattern* (not raw URL) to keep cardinality low. */
export function httpMetricsMiddleware(req, res, next) {
  const end = metrics.httpDuration.startTimer();
  res.on('finish', () => {
    const route = req.route?.path
      ? `${req.baseUrl || ''}${req.route.path}`
      : (res.statusCode === 404 ? 'not_found' : 'other');
    end({ method: req.method, route, status: String(res.statusCode) });
  });
  next();
}
