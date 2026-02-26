import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => {
  res.json({ message: "Great Scott! The server is alive. Now go hit /identify." });
});

// Phase 2 will wire up the real endpoint here.
// For now, we're just making sure the lights come on.
app.post('/identify', (_req, res) => {
  res.status(501).json({ message: "Not implemented yet. We're still in 1985." });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
