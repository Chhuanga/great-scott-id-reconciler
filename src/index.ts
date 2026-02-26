import express from 'express';
import { identifyController } from './identify.controller';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => {
  res.json({ message: "Great Scott! The server is alive. Now go hit /identify." });
});

app.post('/identify', identifyController);

app.listen(PORT, () => {
  console.log(`Great wow the Server is running on port ${PORT}`);
});

export default app;
