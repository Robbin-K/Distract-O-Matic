// popup.js
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const studyModeToggle = document.getElementById('studyModeToggle');
    const statusText = document.getElementById('statusText');
    const setupView = document.getElementById('setupView');
    const activeView = document.getElementById('activeView');
    const studyTopicInput = document.getElementById('studyTopic');
    const apiSelectInput = document.getElementById('apiSelect');
    const apiKeyInput = document.getElementById('apiKey');
    const saveButton = document.getElementById('saveButton');
    const editButton = document.getElementById('editButton');
    const currentTopicSpan = document.getElementById('currentTopic');
    const videosWatchedSpan = document.getElementById('videosWatched');
    const videosBlockedSpan = document.getElementById('videosBlocked');
  
    // Load saved settings
    chrome.storage.local.get(['studyMode', 'studyTopic', 'apiType', 'apiKey', 'stats'], function(data) {
      if (data.studyMode) {
        studyModeToggle.checked = true;
        statusText.textContent = 'ON';
        setupView.classList.add('hidden');
        activeView.classList.remove('hidden');
      }
      
      if (data.studyTopic) {
        studyTopicInput.value = data.studyTopic;
        currentTopicSpan.textContent = data.studyTopic;
      }
      
      if (data.apiType) {
        apiSelectInput.value = data.apiType;
      }
      
      if (data.apiKey) {
        apiKeyInput.value = data.apiKey;
      }
      
      // Update stats if available
      if (data.stats) {
        videosWatchedSpan.textContent = data.stats.watched || 0;
        videosBlockedSpan.textContent = data.stats.blocked || 0;
      }
    });
  
    // Toggle study mode
    studyModeToggle.addEventListener('change', function() {
      const isEnabled = this.checked;
      statusText.textContent = isEnabled ? 'ON' : 'OFF';
      
      if (isEnabled) {
        // Check if we have all required settings
        chrome.storage.local.get(['studyTopic', 'apiKey'], function(data) {
          if (!data.studyTopic || !data.apiKey) {
            alert('Please set your study topic and API key first');
            studyModeToggle.checked = false;
            statusText.textContent = 'OFF';
            return;
          }
          
          // Enable study mode
          chrome.storage.local.set({ studyMode: true });
          setupView.classList.add('hidden');
          activeView.classList.remove('hidden');
          
          // Send message to background script
          chrome.runtime.sendMessage({ action: 'enableStudyMode' });
        });
      } else {
        // Disable study mode
        chrome.storage.local.set({ studyMode: false });
        setupView.classList.remove('hidden');
        activeView.classList.add('hidden');
        
        // Send message to background script
        chrome.runtime.sendMessage({ action: 'disableStudyMode' });
      }
    });
  
    // Save settings
    saveButton.addEventListener('click', function() {
      const studyTopic = studyTopicInput.value.trim();
      const apiType = apiSelectInput.value;
      const apiKey = apiKeyInput.value.trim();
      
      if (!studyTopic) {
        alert('Please enter your study topic');
        return;
      }
      
      if (!apiKey) {
        alert('Please enter your API key');
        return;
      }
      
      // Save settings
      chrome.storage.local.set({
        studyTopic: studyTopic,
        apiType: apiType,
        apiKey: apiKey
      }, function() {
        currentTopicSpan.textContent = studyTopic;
        
        // If study mode is enabled, update the background script
        if (studyModeToggle.checked) {
          chrome.runtime.sendMessage({ action: 'updateSettings' });
        }
        
        alert('Settings saved successfully!');
      });
    });
  
    // Edit settings
    editButton.addEventListener('click', function() {
      setupView.classList.remove('hidden');
      activeView.classList.add('hidden');
    });
    
    // Listen for stats updates
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.action === 'updateStats' && request.stats) {
        videosWatchedSpan.textContent = request.stats.watched || 0;
        videosBlockedSpan.textContent = request.stats.blocked || 0;
      }
    });
  });