// content.js
// YouTube video data scraper
class YouTubeDataScraper {
  constructor() {
    this.lastUrl = window.location.href;
    this.observer = null;
  }
  
  startMonitoring() {
    // Use the History API to detect navigation changes
    this.setupHistoryChangeListener();
    
    // Also use MutationObserver as a fallback for SPAs
    this.setupMutationObserver();
    
    // Check the current page immediately
    if (this.isVideoPage()) {
      this.scrapeVideoData();
    }
  }
  
  stopMonitoring() {
    // Remove history listeners
    window.removeEventListener('popstate', this.handleUrlChange);
    
    // Disconnect the observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
  
  setupHistoryChangeListener() {
    // Bind the method to preserve 'this' context
    this.handleUrlChange = this.handleUrlChange.bind(this);
    
    // Listen for browser history changes
    window.addEventListener('popstate', this.handleUrlChange);
    
    // Intercept pushState and replaceState calls
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.handleUrlChange();
    };
    
    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.handleUrlChange();
    };
  }
  
  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      if (window.location.href !== this.lastUrl) {
        this.lastUrl = window.location.href;
        this.handleUrlChange();
      }
    });
    
    // Observe changes to the document
    this.observer.observe(document, { 
      subtree: true, 
      childList: true 
    });
  }
  
  handleUrlChange() {
    this.lastUrl = window.location.href;
    
    // Only process YouTube video pages
    if (this.isVideoPage()) {
      // Use requestAnimationFrame instead of setTimeout for better performance
      requestAnimationFrame(() => {
        // Wait for page to be ready using a more efficient approach
        this.waitForElementAndScrape('h1.ytd-watch-metadata');
      });
    }
  }
  
  waitForElementAndScrape(selector, maxAttempts = 10, attempt = 0) {
    const element = document.querySelector(selector);
    
    if (element) {
      this.scrapeVideoData();
    } else if (attempt < maxAttempts) {
      // Retry with exponential backoff
      setTimeout(() => {
        this.waitForElementAndScrape(selector, maxAttempts, attempt + 1);
      }, Math.min(100 * Math.pow(1.5, attempt), 2000));
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
    
    // Redirect after 1 second
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