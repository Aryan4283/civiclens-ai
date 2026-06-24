const cron = require('node-cron');
const { runEscalator } = require('../agents/escalatorAgent');

function startCronJobs() {
  // Run every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('🔄 Running Escalator Agent...');
    const result = await runEscalator();
    console.log('Escalator result:', result.log);
  });
  
  console.log('⏰ Cron jobs started');
}

module.exports = { startCronJobs };
