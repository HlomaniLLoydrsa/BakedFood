// Netlify Function — wraps the Express backend
// Using plain JS to avoid esbuild TypeScript bundling issues

// Register ts-node so we can require TypeScript files at runtime
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'commonjs' },
});

const serverless = require('serverless-http');
const { default: app } = require('../../backend/src/app');

exports.handler = serverless(app);
