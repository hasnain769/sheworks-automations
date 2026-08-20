const axios = require('axios');

const payload = {
  "event": "taskCustomFieldUpdated",
  "task_id": "86eykmd75",
  "history_items": [
    {
      "custom_field": {
        "id": "431a53e0-15b4-4516-b018-48584aa84aba", // PRODUCT STATUS
        "name": "PRODUCT STATUS"
      },
      "after": "9e3874c2-1f7d-4a14-91d2-e876d5c1081a" // "Ready to Publish"
    }
  ]
};

async function run() {
  console.log("Sending simulated webhook to local server...");
  try {
    const res = await axios.post('http://localhost:3000/api/webhook', payload);
    console.log("Server Response:", res.data);
  } catch (error) {
    console.error("Error from server:", error.response ? error.response.data : error.message);
  }
}

run();
