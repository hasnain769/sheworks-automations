const axios = require('axios');
require('dotenv').config();

const { CLICKUP_API_TOKEN } = process.env;
const LIST_ID = "901819893199"; // Product Master Database

const webhookUrl = process.argv[2];

if (!webhookUrl) {
  console.error("Please provide a webhook URL. Usage: node scripts/register_clickup_webhook.js <ngrok_url>");
  process.exit(1);
}

const TEAM_ID = "90182825132"; // Sheworks Team

async function registerWebhook() {
  console.log(`Registering webhook for List ${LIST_ID} to endpoint: ${webhookUrl}`);
  
  try {
    const response = await axios.post(
      `https://api.clickup.com/api/v2/team/${TEAM_ID}/webhook`,
      {
        endpoint: webhookUrl,
        events: [
          "*"
        ],
        list_id: LIST_ID
      },
      {
        headers: {
          'Authorization': CLICKUP_API_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log("Success! Webhook Registered.");
    console.log("Webhook ID:", response.data.webhook.id);
  } catch (error) {
    console.error("Error registering webhook:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
  }
}

registerWebhook();
