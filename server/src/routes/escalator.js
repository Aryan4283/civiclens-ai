const express = require('express');
const router = express.Router();
const { runEscalator } = require('../agents/escalatorAgent');

router.post('/run', async (req, res) => {
  const result = await runEscalator();
  res.json(result);
});

module.exports = router;

