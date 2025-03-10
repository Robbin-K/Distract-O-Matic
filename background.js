// background.js
// Factory pattern for AI service providers
class AIServiceFactory {
    static createService(type) {
      switch (type) {
        case 'openai':
          return new OpenAIService();
        case 'deepseek':
          return new DeepseekService();
        default:
          return new OpenAIService();
      }
    }
  }
  
  // OpenAI Service
  class OpenAIService {
    async checkRelevance(apiKey, studyTopic, videoData) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that determines if video content is relevant to a study topic. Respond with a JSON object with a single boolean property "isRelevant".'
            },
            {
              role: 'user',
              content: `Study Topic: ${studyTopic}\nVideo Title: ${videoData.title}\nVideo Description: ${videoData.description}\nIs this video relevant to the study topic? Respond with only a JSON object with a single boolean property "isRelevant".`
            }
          ],
          temperature: 0.3
        })
      });
      
      const data = await response.json();
      
      try {
        let  content = data.choices[0].message.content;
        content = content.replace(/```json|```/g, '').trim();

        const result = JSON.parse(content);
        return { isRelevant: result.isRelevant };
      } catch (error) {
        console.error('Error parsing AI response:', error);
        // Default to allowing the video if there's an error
        return { isRelevant: true };
      }
    }
  }
  
  // Deepseek Service
  class DeepseekService {
    async checkRelevance(apiKey, studyTopic, videoData) {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that determines if video content is relevant to a study topic. Respond with a JSON object with a single boolean property "isRelevant".'
            },
            {
              role: 'user',
              content: `Study Topic: ${studyTopic}\nVideo Title: ${videoData.title}\nVideo Description: ${videoData.description}\nIs this video relevant to the study topic? Respond with only a JSON object with a single boolean property "isRelevant".`
            }
          ],
          temperature: 0.3
        })
      });
      
      const data = await response.json();
      
      try {
        const content = data.choices[0].message.content;
        const result = JSON.parse(content);
        return { isRelevant: result.isRelevant };
      } catch (error) {
        console.error('Error parsing AI response:', error);
        // Default to allowing the video if there's an error
        return { isRelevant: true };
      }
    }
  }
  
  // Stats manager to keep track of videos watched and blocked
  class StatsManager {
    constructor() {
      this.stats = { watched: 0, blocked: 0 };
      this.loadStats();
    }
    
    async loadStats() {
      const data = await chrome.storage.local.get('stats');
      if (data.stats) {
        this.stats = data.stats;
      }
    }
    
    incrementWatched() {
      this.stats.watched++;
      this.saveStats();
    }
    
    incrementBlocked() {
      this.stats.blocked++;
      this.saveStats();
    }
    
    async saveStats() {
      await chrome.storage.local.set({ stats: this.stats });
      // Notify popup to update stats
      chrome.runtime.sendMessage({ action: 'updateStats', stats: this.stats });
    }
  }
  
  // Main controller for the extension
  class StudyModeController {
    constructor() {
      this.isEnabled = false;
      this.studyTopic = '';
      this.aiService = null;
      this.apiKey = '';
      this.statsManager = new StatsManager();
      
      this.init();
    }
    
    async init() {
      // Load initial state
      const data = await chrome.storage.local.get(['studyMode', 'studyTopic', 'apiType', 'apiKey']);
      
      this.isEnabled = data.studyMode || false;
      this.studyTopic = data.studyTopic || '';
      this.apiKey = data.apiKey || '';
      
      if (data.apiType) {
        this.aiService = AIServiceFactory.createService(data.apiType);
      } else {
        this.aiService = AIServiceFactory.createService('openai');
      }
      
      // Set up message listeners
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
          case 'enableStudyMode':
            this.enableStudyMode();
            break;
          case 'disableStudyMode':
            this.disableStudyMode();
            break;
          case 'updateSettings':
            this.updateSettings();
            break;
          case 'checkVideoRelevance':
            this.checkVideoRelevance(request.videoData, sender.tab.id);
            break;
        }
        return true; // Keep the message channel open for async responses
      });
    }
    
    enableStudyMode() {
      this.isEnabled = true;
    }
    
    disableStudyMode() {
      this.isEnabled = false;
    }
    
    async updateSettings() {
      const data = await chrome.storage.local.get(['studyTopic', 'apiType', 'apiKey']);
      
      this.studyTopic = data.studyTopic || this.studyTopic;
      this.apiKey = data.apiKey || this.apiKey;
      
      if (data.apiType) {
        this.aiService = AIServiceFactory.createService(data.apiType);
      }
    }
    
    async checkVideoRelevance(videoData, tabId) {
      if (!this.isEnabled) {
        return;
      }
      
      try {
        const result = await this.aiService.checkRelevance(
          this.apiKey,
          this.studyTopic,
          videoData
        );
        
        if (result.isRelevant) {
          // Video is relevant, allow watching
          this.statsManager.incrementWatched();
          chrome.tabs.sendMessage(tabId, { action: 'videoAllowed' });
        } else {
          // Video is not relevant, redirect
          this.statsManager.incrementBlocked();
          chrome.tabs.sendMessage(tabId, { 
            action: 'videoBlocked',
            studyTopic: this.studyTopic 
          });
        }
      } catch (error) {
        console.error('Error checking video relevance:', error);
        // Default to allowing the video if there's an error
        chrome.tabs.sendMessage(tabId, { action: 'videoAllowed' });
      }
    }
  }
  
  // Initialize the controller
  const controller = new StudyModeController();