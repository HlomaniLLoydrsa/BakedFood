import 'dotenv/config';
import serverless from 'serverless-http';
import app from '../../backend/src/app';

// Wrap the Express app as a Netlify serverless function
export const handler = serverless(app);
