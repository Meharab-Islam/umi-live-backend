/**
 * PM2 cluster config: one worker per CPU core sharing the same port.
 *
 *   npm run start:cluster            (pm2-runtime, keeps the container in the foreground)
 *
 * Requirements for running more than one worker (or more than one machine):
 *   - Redis reachable (REDIS_HOST/PORT)
 *   - SOCKET_REDIS_ADAPTER=true  (forced on below) so socket rooms/broadcasts span workers
 * Everything is tunable through .env (see .env.example "HORIZONTAL SCALING").
 */
module.exports = {
  apps: [
    {
      name: `${process.env.PROJECT_NAME || 'umi'}-backend`,
      script: 'src/server.js',
      exec_mode: 'cluster',
      instances: process.env.PM2_INSTANCES || 'max',
      max_memory_restart: process.env.PM2_MAX_MEMORY || '1500M',
      // server.js sends process.send('ready') once listening; PM2 only routes traffic after that.
      wait_ready: true,
      listen_timeout: 180000, // first boot may run DB schema/seed
      // Give graceful shutdown (drain + close) time before SIGKILL.
      kill_timeout: parseInt(process.env.SHUTDOWN_FORCE_MS || '20000', 10) + 5000,
      // Roll restarts one worker at a time so connections are never all dropped together.
      increment_var: 'INSTANCE_ID',
      env: {
        NODE_ENV: 'production',
        SOCKET_REDIS_ADAPTER: 'true',
      },
    },
  ],
};
