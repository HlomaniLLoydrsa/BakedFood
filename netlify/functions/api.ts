// Netlify injects env vars automatically — dotenv not needed
// But we require it here so esbuild can find it if it scans imports
import 'dotenv/config';
import serverless from 'serverless-http';
import app from '../../backend/src/app';

export const handler = serverless(app);
