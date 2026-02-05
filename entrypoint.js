#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const outPath = path.join('/usr/share/nginx/html', 'env-config.js');
const env = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
  VITE_ADMIN_PASSWORD: process.env.VITE_ADMIN_PASSWORD || '',
};
fs.writeFileSync(outPath, 'window.__ENV__ = ' + JSON.stringify(env) + ';\n');

const { execSync } = require('child_process');
execSync('nginx -g "daemon off;"', { stdio: 'inherit' });
