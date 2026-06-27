require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(express.json({ limit: '75mb' }));
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));

// Routes
app.use('/api/issues', require('./routes/issues'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/escalator', require('./routes/escalator'));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'CivicLens API' });
});

const { startCronJobs } = require('./utils/cron');
startCronJobs();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`CivicLens backend listening on port ${PORT}`);
});

