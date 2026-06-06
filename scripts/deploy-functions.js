/**
 * Firebase CLI times out analyzing functions on slower Windows machines (default 10s).
 * See: https://firebase.google.com/docs/functions/tips#avoid_deployment_timeouts_during_initialization
 */
const { spawnSync } = require('child_process');

process.env.FUNCTIONS_DISCOVERY_TIMEOUT = process.env.FUNCTIONS_DISCOVERY_TIMEOUT || '60000';

const args = process.argv.slice(2);
const only = args.length > 0 ? args.join(',') : 'functions';

const result = spawnSync('firebase', ['deploy', '--only', only], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
