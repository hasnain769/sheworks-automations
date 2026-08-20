const express = require('express');
const webhookHandler = require('../api/webhook');
require('dotenv').config();

const app = express();
app.use(express.json());

// Forward requests to our serverless handler
app.post('/api/webhook', async (req, res) => {
  await webhookHandler(req, res);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Local Webhook Server running on http://localhost:${PORT}`);
  console.log(`To expose this to ClickUp, run: npx ngrok http ${PORT}`);
  console.log(`Then register the webhook: node scripts/register_clickup_webhook.js <ngrok_url>/api/webhook`);
});
