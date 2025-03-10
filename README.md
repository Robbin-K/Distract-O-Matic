# Distract-O-Matic

Distract-O-Matic is a Chrome extension designed to help you stay focused on your study topics by automatically blocking YouTube videos that are unrelated to your current study subject. By leveraging AI services, the extension analyzes video titles and descriptions in real time and prevents distracting content from interrupting your study sessions.

## Features

- **Study Mode Toggle:** Easily enable or disable study mode from the extension popup.
- **Topic-Specific Filtering:** Enter your study topic to filter out irrelevant YouTube videos.
- **AI-Powered Relevance Check:** Choose between different AI models (OpenAI or DeepSeek) to evaluate if a video matches your study focus.
- **Real-Time Video Scraping:** Automatically detects when you navigate to a YouTube video page and checks the video’s relevance.
- **Automatic Redirection:** If you click on a video that is unrelated to your study topic, you are automatically redirected to a YouTube search results page with your study topic.
- **Activity Stats:** Track the number of videos watched versus blocked during your study sessions.

## File Structure

- **manifest.json:** Defines the extension metadata, permissions, background script, content scripts, and popup configuration.
- **background.js:** Implements the core logic:
  - Uses the Factory Pattern to select the AI service (OpenAI or DeepSeek).
  - Manages the study mode state and tracks statistics (videos watched and blocked).
  - Listens for messages from the content script to check video relevance.
- **content.js:** Scrapes YouTube video data (title and description) and sends it to the background script. Also handles UI notifications for blocked videos and redirects users if a video is deemed irrelevant.
- **popup/**  
  - **popup.html:** Provides the extension’s user interface where you can toggle study mode, input your study topic, select the AI model, and set your API key.
  - **popup.js:** Contains the logic for handling user interactions, saving settings, toggling study mode, and updating video statistics.
  - **popup.css:** Styles the popup for a clean and responsive look.
- **icon.png:** The extension’s icon displayed in the Chrome toolbar.

## Installation

1. **Clone or download the repository.**
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer Mode** (toggle in the top right).
4. Click on **Load unpacked** and select the folder containing the extension files.
5. The extension should now appear in your toolbar.

## Usage

1. **Open the Popup:** Click the Distract-O-Matic icon to open the popup.
2. **Configure Settings:**
   - Enter your study topic (e.g., "Programming", "History", "Math").
   - Select your preferred AI model (either OpenAI or DeepSeek).
   - Provide your API key for the chosen AI service.
3. **Activate Study Mode:** Toggle the switch to enable study mode.
4. **Browse YouTube:** When you visit a YouTube video page, the extension automatically scrapes the video details and sends them for analysis.
   - If the video is deemed irrelevant to your study topic, a notification appears and you’re redirected to a YouTube search results page for your study topic.
   - The extension keeps track of how many videos you watch versus how many are blocked.

## How It Works

- **Background Script:**  
  The background script listens for events (e.g., study mode toggling and video relevance checks) and communicates with the AI services to determine if a video aligns with your study topic.  

- **Content Script:**  
  The content script monitors YouTube pages for video URL changes, scrapes necessary video information, and notifies the background script. It also manages user notifications for blocked videos and handles redirection to a YouTube search page based on your study topic.  

- **Popup Interface:**  
  The popup allows you to configure settings and view statistics on videos watched and blocked. It communicates directly with Chrome’s storage and sends messages to update the extension’s state.  

## License

This project is licensed under the MIT License.
