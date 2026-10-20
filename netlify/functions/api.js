// Netlify Function — wraps the Express backend
// The backend is compiled to backend/dist by the build command (npm run build --prefix backend)

const serverless = require('serverless-http');
const { default: app } = require('../../backend/dist/app');

exports.handler = serverless(app);
