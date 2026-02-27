import express from 'express';
import { identifyController } from './identify.controller';
import { errorMiddleware, notFoundMiddleware } from './middlewares';
import prisma from './db';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => {
  res.json({ message: "Great Scott! The server is alive. Now go hit /identify." });
});

app.post('/identify', identifyController);

// Must come after all routes.
app.use(notFoundMiddleware);
app.use(errorMiddleware);

const server = app.listen(PORT, () => {
  console.log(`Great wow the Server is running on port ${PORT}`);
});

// Graceful shutdown — don't leave the database connection open when the world ends.
async function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database disconnected. See you in the future.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
