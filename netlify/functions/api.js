// Netlify Function — wraps the compiled Express backend.
//
// The backend is compiled to plain JS (backend/dist) during the Netlify build
// (see netlify.toml build command). We require the compiled output directly —
// no ts-node / TypeScript at runtime, which keeps cold starts fast and avoids
// bundling the TypeScript compiler into the function.

const serverless = require('serverless-http');
const app = require('../../backend/dist/app').default;

exports.handler = serverless(app);
