const axios = require('axios');
require('dotenv').config();

const { CLICKUP_API_TOKEN } = process.env;

const clickupClient = axios.create({
  baseURL: 'https://api.clickup.com/api/v2',
  headers: {
    'Authorization': CLICKUP_API_TOKEN,
    'Content-Type': 'application/json'
  }
});

/**
 * Fetches a task and its custom fields from ClickUp.
 * @param {string} taskId 
 * @returns {Object} The task data
 */
async function getTask(taskId) {
  if (!CLICKUP_API_TOKEN) throw new Error("Missing CLICKUP_API_TOKEN");

  try {
    const response = await clickupClient.get(`/task/${taskId}?include_subtasks=true`);
    return response.data;
  } catch (error) {
    console.error("ClickUp API Error (getTask):", error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * Posts a comment to a ClickUp task.
 * @param {string} taskId 
 * @param {string} commentText 
 */
async function postComment(taskId, commentText) {
  try {
    await clickupClient.post(`/task/${taskId}/comment`, {
      comment_text: commentText
    });
  } catch (error) {
    console.error("ClickUp API Error (postComment):", error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * Updates the standard status of a ClickUp task.
 * @param {string} taskId 
 * @param {string} statusName 
 */
async function updateTaskStatus(taskId, statusName) {
  try {
    await clickupClient.put(`/task/${taskId}`, {
      status: statusName
    });
  } catch (error) {
    console.error("ClickUp API Error (updateTaskStatus):", error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * Updates a custom field of a ClickUp task.
 * @param {string} taskId 
 * @param {string} fieldId 
 * @param {*} value 
 */
async function updateCustomField(taskId, fieldId, value) {
  try {
    await clickupClient.post(`/task/${taskId}/field/${fieldId}`, {
      value: value
    });
  } catch (error) {
    console.error("ClickUp API Error (updateCustomField):", error.response ? error.response.data : error.message);
    throw error;
  }
}

module.exports = {
  getTask,
  postComment,
  updateTaskStatus,
  updateCustomField
};
