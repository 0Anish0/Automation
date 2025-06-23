const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
const cheerio = require('cheerio');
const os = require('os');
const { config } = require('../config/config');
const HumanBehavior = require('../utils/humanBehavior');
const logger = require('../utils/logger');

// Configure puppeteer plugins
puppeteer.use(StealthPlugin());
puppeteer.use(RecaptchaPlugin({
  provider: { id: '2captcha', token: 'APIKEY' }, // You can configure this
  visualFeedback: true
}));

class LinkedInService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
    this.sessionBehavior = HumanBehavior.generateSessionBehavior();
  }

  /**
   * Get Chrome executable path based on platform
   */
  getChromeExecutablePath() {
    const platform = os.platform();
    
    switch (platform) {
      case 'win32':
        // Windows paths
        return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      case 'darwin':
        // macOS path
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      case 'linux':
        // Linux paths
        return '/usr/bin/google-chrome-stable';
      default:
        // Let Puppeteer auto-detect
        return null;
    }
  }

  /**
   * Initialize browser and setup
   */
  async initialize() {
    try {
      logger.botAction('Initializing browser');
      
      const chromeExecutablePath = this.getChromeExecutablePath();
      const launchOptions = {
        headless: config.browser.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--exclude-switches=enable-automation',
          '--disable-extensions',
          '--no-first-run',
          '--disable-default-apps',
          '--disable-component-extensions-with-background-pages',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI,BlinkGenPropertyTrees',
          '--disable-ipc-flooding-protection',
          '--enable-features=NetworkService,NetworkServiceLogging',
          '--force-color-profile=srgb',
          '--metrics-recording-only',
          '--use-mock-keychain',
          '--disable-web-security',
          '--allow-running-insecure-content',
          '--autoplay-policy=user-gesture-required',
          '--disable-component-update',
          '--disable-domain-reliability',
          '--disable-features=AudioServiceOutOfProcess',
          '--disable-print-preview',
          '--disable-speech-api',
          '--hide-scrollbars',
          '--mute-audio'
        ],
        defaultViewport: HumanBehavior.addViewportJitter(config.browser.viewport),
        timeout: 60000,
        protocolTimeout: 60000,
        ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=IdleDetection']
      };

      // Add executablePath if we found Chrome
      if (chromeExecutablePath) {
        launchOptions.executablePath = chromeExecutablePath;
      }

      this.browser = await puppeteer.launch(launchOptions);

      this.page = await this.browser.newPage();
      
      // Override the webdriver property
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
        
        // Override the plugins property to use a custom getter
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
        
        // Override the languages property to use a custom getter
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });
        
        // Override the permissions property
        const originalQuery = window.navigator.permissions.query;
        return window.navigator.permissions.query = (parameters) => {
          return parameters.name === 'notifications' ?
            Promise.resolve({ state: Cypress.denied }) :
            originalQuery(parameters);
        };
      });
      
      // Set user agent with more realistic values
      const userAgent = HumanBehavior.getRandomUserAgent();
      await this.page.setUserAgent(userAgent);
      
      // Set additional headers to appear more human
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      });

      // IMPORTANT: Only block heavy resources, keep CSS for proper rendering
      await this.page.setRequestInterception(true);
      this.page.on('request', (req) => {
        const resourceType = req.resourceType();
        const url = req.url();
        
        // Block only heavy media files, keep CSS and fonts for proper rendering
        if (resourceType === 'image' && (url.includes('.jpg') || url.includes('.png') || url.includes('.gif'))) {
          req.abort();
        } else if (resourceType === 'media' || url.includes('video')) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Add random mouse movements on page load
      this.page.on('load', async () => {
        await HumanBehavior.addRandomMouseMovements(this.page);
      });

      logger.botAction('Browser initialized successfully');
      return true;
    } catch (error) {
      logger.botError('Browser initialization', error);
      throw error;
    }
  }

  /**
   * Login to LinkedIn
   */
  async login() {
    try {
      logger.botAction('Starting LinkedIn login');
      
      await this.page.goto(config.linkedin.baseUrl + '/login', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });


      
      // Random delay before login (human-like pause to read)
      await HumanBehavior.randomDelay(3000, 6000);

      // Check if we're actually on login page
      const loginPageTitle = await this.page.title();
      logger.botAction('Current page', { url: this.page.url(), title: loginPageTitle });

      // Type email with more realistic behavior
      logger.botAction('Typing email...');
      await HumanBehavior.realisticTypeText(
        this.page, 
        config.selectors.loginEmail, 
        config.linkedin.email
      );

      await HumanBehavior.randomDelay(1500, 3000);

      // Type password with realistic behavior
      logger.botAction('Typing password...');
      await HumanBehavior.realisticTypeText(
        this.page, 
        config.selectors.loginPassword, 
        config.linkedin.password
      );

      await HumanBehavior.randomDelay(2000, 4000);



      // Click login button
      logger.botAction('Clicking login button...');
      await HumanBehavior.humanClick(this.page, config.selectors.loginButton);

      // Wait and see what happens - be more patient
      logger.botAction('Waiting for login response...');
      
      try {
        // Wait for navigation with longer timeout
        await this.page.waitForNavigation({ 
          waitUntil: 'networkidle0',
          timeout: 45000 
        });
      } catch (navError) {
        logger.botAction('Navigation timeout - checking current state');
      }



      // Wait a bit more for any redirects
      await HumanBehavior.randomDelay(3000, 5000);

      // More comprehensive login success detection
      let currentUrl, pageContent, pageTitle;
      
      try {
        currentUrl = this.page.url();
        pageTitle = await this.page.title();
        
        // Try to get page content, but handle navigation gracefully
        try {
          pageContent = await this.page.content();
        } catch (contentError) {
          logger.botAction('Page content unavailable after navigation - this is normal');
          pageContent = '';
        }
        
        logger.botAction('Login attempt completed', { 
          url: currentUrl,
          title: pageTitle
        });
      } catch (error) {
        logger.botAction('Error getting page state after login, but continuing...', { error: error.message });
        currentUrl = '';
        pageContent = '';
        pageTitle = '';
      }

      // Check for various success indicators
      const successIndicators = [
        currentUrl.includes('/feed'),
        currentUrl.includes('/in/'),
        currentUrl.includes('/mynetwork'),
        currentUrl.includes('/jobs'),
        pageContent.includes('LinkedIn Home'),
        pageContent.includes('Start a post'),
        pageContent.includes('Share an update')
      ];

             // Check for security challenges
       const securityIndicators = [
         currentUrl.includes('/challenge'),
         currentUrl.includes('/checkpoint'),
         currentUrl.includes('/verify'),
         pageTitle.includes('Security Verification'),
         pageTitle.includes('Security Check'),
         pageContent.includes('security check'),
         pageContent.includes('verify your identity'),
         pageContent.includes('unusual activity'),
         pageContent.includes('captcha'),
         pageContent.includes('CAPTCHA')
       ];

      if (successIndicators.some(indicator => indicator)) {
        this.isLoggedIn = true;
        logger.botAction('LinkedIn login successful!', { url: currentUrl });
        
        // Human-like behavior after successful login
        await HumanBehavior.simulatePageReading(this.page);
        
        return true;
      } else if (securityIndicators.some(indicator => indicator)) {
        logger.security.detected('LinkedIn security challenge detected', { url: currentUrl });
        
        // Keep browser open for manual intervention
        logger.botAction('PLEASE COMPLETE SECURITY CHALLENGE MANUALLY IN THE BROWSER');
        logger.botAction('The bot will wait for 2 minutes for you to complete it...');
        
        // Wait 2 minutes for manual completion
        await new Promise(resolve => setTimeout(resolve, 120000));
        
        // Check again after manual intervention
        const finalUrl = this.page.url();
        if (finalUrl.includes('/feed') || finalUrl.includes('/in/')) {
          this.isLoggedIn = true;
          logger.botAction('Login successful after manual security challenge completion');
          return true;
        }
        
        return false;
             } else {
         // Try to get page title again for better debugging
         let finalTitle = pageTitle;
         try {
           finalTitle = await this.page.title();
         } catch (titleError) {
           logger.botAction('Could not get page title for debugging');
         }
         
         logger.security.detected('Login failed - unknown state', { 
           url: currentUrl,
           title: finalTitle
         });
         
         // Manual check if title contains security verification
         if (finalTitle && finalTitle.includes('Security Verification')) {
           logger.botAction('DETECTED: LinkedIn Security Verification page');
           logger.botAction('PLEASE COMPLETE SECURITY CHALLENGE MANUALLY IN THE BROWSER');
           logger.botAction('The bot will wait for 2 minutes for you to complete it...');
           
           // Wait 2 minutes for manual completion
           await new Promise(resolve => setTimeout(resolve, 120000));
           
           // Check again after manual intervention
           try {
             const finalUrl = this.page.url();
             if (finalUrl.includes('/feed') || finalUrl.includes('/in/')) {
               this.isLoggedIn = true;
               logger.botAction('Login successful after manual security challenge completion');
               return true;
             }
           } catch (checkError) {
             logger.botAction('Error checking final state after manual intervention');
           }
           
           return false;
         }
        
        // Keep browser open for inspection
        logger.botAction('LOGIN FAILED - Browser kept open for inspection');
        logger.botAction('Please check the browser window to see what happened');
        
        // Wait 30 seconds for inspection
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        return false;
      }
    } catch (error) {
      logger.botError('LinkedIn login', error);
      

      
      throw error;
    }
  }

  /**
   * Search for jobs with given keywords
   */
  async searchJobs(keywords) {
    try {
      if (!this.isLoggedIn) {
        throw new Error('Must be logged in to search jobs');
      }

      logger.botAction('Searching for jobs', { keywords });
      const allJobs = [];

      for (const keyword of keywords) {
        await HumanBehavior.randomDelay(3000, 6000);
        
        logger.botAction('Searching for keyword', { keyword });
        
        // Navigate to search
        const searchUrl = `${config.linkedin.searchUrl}?keywords=${encodeURIComponent(keyword)}`;
        await this.page.goto(searchUrl, { waitUntil: 'networkidle2' });

        await HumanBehavior.randomDelay(2000, 4000);

        // Scroll to load more content
        await this.scrollAndLoadContent();

        // Extract job posts
        const jobs = await this.extractJobPosts(keyword);
        allJobs.push(...jobs);

        // Random browsing behavior between searches
        await HumanBehavior.randomBrowsingBehavior(this.page);
      }

      logger.botAction('Job search completed', { 
        totalJobs: allJobs.length,
        keywords: keywords.length 
      });

      return allJobs;
    } catch (error) {
      logger.botError('Job search', error);
      throw error;
    }
  }

  /**
   * Scroll page and load more content
   */
  async scrollAndLoadContent() {
    const maxScrolls = 5;
    
    for (let i = 0; i < maxScrolls; i++) {
      // Scroll down
      await HumanBehavior.humanScroll(this.page, 400);
      
      // Check for "Load More" or similar buttons
      try {
        const loadMoreButton = await this.page.$(config.selectors.loadMoreButton);
        if (loadMoreButton) {
          await HumanBehavior.humanClick(this.page, config.selectors.loadMoreButton);
          await HumanBehavior.randomDelay(2000, 4000);
        }
      } catch (error) {
        // No load more button, continue scrolling
      }

      await HumanBehavior.randomDelay(1000, 3000);
    }
  }

  /**
   * Extract job posts from current page
   */
  async extractJobPosts(searchKeyword) {
    try {
      const jobs = [];
      
      // Get page content
      const content = await this.page.content();
      const $ = cheerio.load(content);

      // Find job post containers
      const postContainers = $(config.selectors.postContainer);
      
      logger.botAction('Found post containers', { count: postContainers.length });

      for (let i = 0; i < postContainers.length && i < config.linkedin.maxSearchResults; i++) {
        const postElement = postContainers.eq(i);
        
        try {
          const postData = await this.extractPostData(postElement, $);
          
          if (postData && this.isRelevantJobPost(postData.content, searchKeyword)) {
            postData.searchKeyword = searchKeyword;
            postData.extractedAt = new Date().toISOString();
            jobs.push(postData);
          }
        } catch (error) {
          logger.botError('Extract post data', error, { postIndex: i });
        }
      }

      return jobs;
    } catch (error) {
      logger.botError('Extract job posts', error);
      return [];
    }
  }

  /**
   * Extract data from individual post
   */
  async extractPostData(postElement, $) {
    try {
      const contentElement = postElement.find(config.selectors.postContent);
      const content = contentElement.text().trim();
      
      if (!content) return null;

      // Extract email addresses
      const emails = this.extractEmails(content);
      
      // Get post author info
      const authorElement = postElement.find('[data-test-app-aware-link]').first();
      const authorName = authorElement.text().trim();
      const authorUrl = authorElement.attr('href');

      // Try to extract company name from content or author info
      const company = this.extractCompanyName(content, authorName);

      return {
        content,
        emails,
        author: {
          name: authorName,
          url: authorUrl
        },
        company,
        postUrl: this.page.url(),
        hasEmails: emails.length > 0
      };
    } catch (error) {
      logger.botError('Extract post data', error);
      return null;
    }
  }

  /**
   * Check if post is relevant job posting
   */
  isRelevantJobPost(content, searchKeyword) {
    const jobIndicators = [
      'hiring', 'job', 'position', 'role', 'opportunity',
      'looking for', 'seeking', 'join our team', 'we are hiring',
      'apply', 'candidate', 'developer', 'engineer'
    ];

    const lowerContent = content.toLowerCase();
    const hasJobIndicator = jobIndicators.some(indicator => 
      lowerContent.includes(indicator.toLowerCase())
    );

    // Must contain job indicators and search keyword
    const hasSearchKeyword = lowerContent.includes(searchKeyword.toLowerCase());
    
    return hasJobIndicator && (hasSearchKeyword || content.length > 100);
  }

  /**
   * Extract email addresses from text
   */
  extractEmails(text) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(emailRegex) || [];
    
    // Filter out common non-hiring emails
    const filteredEmails = emails.filter(email => {
      const lowerEmail = email.toLowerCase();
      return !lowerEmail.includes('noreply') && 
             !lowerEmail.includes('no-reply') &&
             !lowerEmail.includes('donotreply');
    });

    return [...new Set(filteredEmails)]; // Remove duplicates
  }

  /**
   * Extract company name from content
   */
  extractCompanyName(content, authorName) {
    // Try to find company name in content
    const companyPatterns = [
      /at ([A-Z][a-zA-Z\s&]+)/,
      /join ([A-Z][a-zA-Z\s&]+)/,
      /([A-Z][a-zA-Z\s&]+) is hiring/,
      /([A-Z][a-zA-Z\s&]+) team/
    ];

    for (const pattern of companyPatterns) {
      const match = content.match(pattern);
      if (match && match[1] && match[1].length < 50) {
        return match[1].trim();
      }
    }

    // Fallback: try to extract from author name
    if (authorName) {
      const nameWords = authorName.split(' ');
      if (nameWords.length > 2) {
        return nameWords.slice(2).join(' ');
      }
    }

    return null;
  }

  /**
   * Click on email link to open Gmail
   */
  async openGmailWithEmail(email) {
    try {
      logger.botAction('Opening Gmail with email', { email });
      
      // Create mailto link
      const mailtoLink = `mailto:${email}`;
      
      // Navigate to mailto link which should open default email client
      await this.page.evaluate((link) => {
        window.open(link, '_blank');
      }, mailtoLink);

      await HumanBehavior.randomDelay(2000, 4000);
      
      logger.botAction('Gmail opened successfully', { email });
      return true;
    } catch (error) {
      logger.botError('Open Gmail', error, { email });
      return false;
    }
  }

  /**
   * Navigate to a specific job post
   */
  async navigateToPost(postUrl) {
    try {
      await this.page.goto(postUrl, { waitUntil: 'networkidle2' });
      await HumanBehavior.randomDelay(2000, 4000);
      return true;
    } catch (error) {
      logger.botError('Navigate to post', error, { postUrl });
      return false;
    }
  }



  /**
   * Check current login status
   */
  async checkLoginStatus() {
    try {
      const currentUrl = this.page.url();
      const isLinkedInUrl = currentUrl.includes('linkedin.com');
      const isLoggedIn = isLinkedInUrl && (
        currentUrl.includes('/feed') || 
        currentUrl.includes('/in/') ||
        currentUrl.includes('/search')
      );
      
      this.isLoggedIn = isLoggedIn;
      return isLoggedIn;
    } catch (error) {
      logger.botError('Check login status', error);
      return false;
    }
  }

  /**
   * Handle potential security challenges
   */
  async handleSecurityChallenge() {
    try {
      const url = this.page.url();
      
      if (url.includes('/challenge')) {
        logger.security.detected('Security challenge detected');

        
        // Wait for manual intervention or automatic solving
        await HumanBehavior.randomDelay(30000, 60000);
        
        return await this.checkLoginStatus();
      }
      
      return true;
    } catch (error) {
      logger.botError('Handle security challenge', error);
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      logger.botAction('LinkedIn service cleanup completed');
    } catch (error) {
      logger.botError('Cleanup', error);
    }
  }
}

module.exports = LinkedInService; 