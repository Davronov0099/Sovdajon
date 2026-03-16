module.exports = {
  apps: [
    {
      name: 'sardorbek-api',
      script: './current/api/server.js',
      cwd: '/var/www/sardorbek',
      instances: process.env.PM2_INSTANCES || 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        TZ: 'Asia/Tashkent',
      },
      max_memory_restart: '500M',
      kill_timeout: 15000,
      listen_timeout: 10000,
      max_restarts: 10,
      min_uptime: 5000,

      // Logging
      error_file: '/var/www/sardorbek/logs/api-error.log',
      out_file: '/var/www/sardorbek/logs/api-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Log rotation (pm2-logrotate module required: pm2 install pm2-logrotate)
      // pm2 set pm2-logrotate:max_size 50M
      // pm2 set pm2-logrotate:retain 7
      // pm2 set pm2-logrotate:compress true
      // pm2 set pm2-logrotate:dateFormat YYYY-MM-DD
    },
  ],
};
