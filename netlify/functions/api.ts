import serverless from 'serverless-http';
import app from '../../backend/src/app';

// Netlify injects environment variables automatically — no dotenv needed
export const handler = serverless(app);
