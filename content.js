// content.js
// YouTube video data scraper
class YouTubeDataScraper {
    constructor() {
      this.lastUrl = '';
      this.checkInterval = null;
    }
    
    startMonitoring() {
      // Check for URL changes every second
      this.checkInterval = setInterval(() => {
        if (window.location.href !== this.lastUrl) {
          this.lastUrl = window.location.href;
          this.handleUrlChange();
        }
      }, 1000);
    }
    
    stopMonitoring() {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
    }
    
    handleUrlChange() {
      // Only process YouTube video pages
      if (this.isVideoPage()) {
        setTimeout(() => {
          this.scrapeVideoData();
        }, 2000); // Wait for page to load
      }
    }
    
    isVideoPage() {
      return window.location.href.includes('youtube.com/watch');
    }
    
    async scrapeVideoData() {
      try {
        // Get video title
        const titleElement = document.querySelector('h1.ytd-watch-metadata');
        if (!titleElement) return;
        
        const title = titleElement.textContent.trim();
        
        // Get video description
        let description = '';
        const descriptionElement = document.querySelector('#description-inline-expander');
        if (descriptionElement) {
          description = descriptionElement.textContent.trim();
        }
        
        // Send data to background script for analysis
        chrome.runtime.sendMessage({
          action: 'checkVideoRelevance',
          videoData: {
            title,
            description,
            url: window.location.href
          }
        });
      } catch (error) {
        console.error('Error scraping video data:', error);
      }
    }
  }
  
  // UI manager for showing notifications
  class UIManager {
    constructor() {
      this.notificationContainer = null;
    }
    
    showBlockedNotification(studyTopic) {
      this.removeExistingNotifications();
      
      // Create notification container
      const container = document.createElement('div');
      container.id = 'study-mode-notification';
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background-color: #f44336;
        color: white;
        padding: 20px;
        text-align: center;
        z-index: 9999;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        font-family: Arial, sans-serif;
      `;
      
      // Create content
      const content = document.createElement('div');
      content.innerHTML = `
        <h3 style="margin: 0 0 10px 0; font-size: 18px;">Study Mode: Video Blocked</h3>
        <p style="margin: 0 0 15px 0; font-size: 16px;">This video is not relevant to your study topic: <strong>${studyTopic}</strong></p>
        <p style="margin: 0 0 5px 0; font-size: 14px;">Redirecting to related videos...</p>
      `;
      
      container.appendChild(content);
      document.body.appendChild(container);
      this.notificationContainer = container;
      
      // Redirect after 3 seconds
      setTimeout(() => {
        window.location.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(studyTopic)}`;
      }, 1000);
    }
    
    removeExistingNotifications() {
      if (this.notificationContainer) {
        this.notificationContainer.remove();
        this.notificationContainer = null;
      }
      
      const existingNotification = document.getElementById('study-mode-notification');
      if (existingNotification) {
        existingNotification.remove();
      }
    }
  }
  
  // Main content script controller
  class ContentController {
    constructor() {
      this.scraper = new YouTubeDataScraper();
      this.uiManager = new UIManager();
      this.isStudyModeEnabled = false;
      
      this.init();
    }
    
    async init() {
      // Check if study mode is enabled
      const data = await chrome.storage.local.get('studyMode');
      this.isStudyModeEnabled = data.studyMode || false;
      
      if (this.isStudyModeEnabled) {
        this.scraper.startMonitoring();
      }
      
      // Listen for messages from background script
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
          case 'videoBlocked':
            this.uiManager.showBlockedNotification(request.studyTopic);
            break;
          case 'videoAllowed':
            this.uiManager.removeExistingNotifications();
            break;
        }
      });
      
      // Listen for study mode changes
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.studyMode) {
          this.isStudyModeEnabled = changes.studyMode.newValue;
          
          if (this.isStudyModeEnabled) {
            this.scraper.startMonitoring();
            // Check current page immediately if it's a video page
            if (this.scraper.isVideoPage()) {
              this.scraper.scrapeVideoData();
            }
          } else {
            this.scraper.stopMonitoring();
            this.uiManager.removeExistingNotifications();
          }
        }
      });
    }
  }
  
  // Initialize the content controller
  const controller = new ContentController();