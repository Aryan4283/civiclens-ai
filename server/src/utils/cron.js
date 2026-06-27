const cron = require('node-cron');
const { runEscalator } = require('../agents/escalatorAgent');
const { runSynthesizer } = require('../agents/synthesizerAgent');

function startCronJobs() {
  // Run escalator every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('🔄 Running Escalator Agent...');
    const result = await runEscalator();
    console.log('Escalator result:', result.log);
  });

  // Run Synthesizer Agent daily at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('📊 Running Synthesizer Agent (Daily City Report)...');
    const result = await runSynthesizer();
    if (result.success) {
      console.log(`[Synthesizer] City health: ${result.data?.city_health_score} — ${result.data?.health_label}`);
    } else {
      console.error('[Synthesizer] Failed:', result.error);
    }
  });
  
  console.log('⏰ Cron jobs started');
}

module.exports = { startCronJobs };
