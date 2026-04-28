const axios = require('axios');

/**
 * Interface for external project management tools.
 * Each provider must implement the 'pushTask' and 'pushDecision' methods.
 */
class IntegrationProvider {
  async pushTask(taskData) { throw new Error('Method not implemented'); }
  async pushDecision(decisionData) { throw new Error('Method not implemented'); }
}

class SlackProvider extends IntegrationProvider {
  constructor(token, channelId) {
    super();
    this.token = token;
    this.channelId = channelId;
  }

  async pushTask(task) {
    const response = await axios.post('https://slack.com/api/chat.postMessage', {
      channel: this.channelId,
      text: `🚀 *New Task from Converto*: ${task}`,
    }, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return response.data;
  }

  async pushDecision(decision) {
    const response = await axios.post('https://slack.com/api/chat.postMessage', {
      channel: this.channelId,
      text: `✅ *Decision Logged via Converto*: ${decision}`,
    }, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return response.data;
  }
}

class JiraProvider extends IntegrationProvider {
  constructor(domain, email, apiToken) {
    super();
    this.domain = domain;
    this.auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  }

  async pushTask(task) {
    const response = await axios.post(`https://${this.domain}.atlassian.net/rest/api/3/issue`, {
      fields: {
        project: { key: 'CONV' }, // Default project key
        summary: `Converto Task: ${task}`,
        issuetype: { name: 'Task' },
        description: {
          type: 'doc',
          version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Generated automatically from meeting transcription via Converto.' }] }]
        }
      }
    }, {
      headers: { 'Authorization': `Basic ${this.auth}`, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async pushDecision(decision) {
    // Decisions are often posted as comments or a specific 'Decision' issue type
    return this.pushTask(`DECISION: ${decision}`);
  }
}

module.exports = {
  SlackProvider,
  JiraProvider,
};
