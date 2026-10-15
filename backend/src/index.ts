import 'dotenv/config';
import app from './app';

const PORT = parseInt(process.env.PORT || '3001', 10);

app.listen(PORT, () => {
  console.log(`\n🚀 Droply API running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  POST   /api/auth/login`);
  console.log(`  GET    /api/auth/me`);
  console.log(`  GET    /api/dashboard`);
  console.log(`  GET    /api/drops/public/:slug`);
  console.log(`  POST   /api/orders`);
  console.log(`  GET    /api/health`);
});
