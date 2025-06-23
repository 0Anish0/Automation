require('dotenv').config();

const config = {
  // LinkedIn Configuration
  linkedin: {
    email: process.env.LINKEDIN_EMAIL,
    password: process.env.LINKEDIN_PASSWORD,
    baseUrl: 'https://www.linkedin.com',
    searchUrl: 'https://www.linkedin.com/search/results/content/',
    maxSearchResults: parseInt(process.env.MAX_SEARCH_RESULTS) || 10
  },

  // Gemini AI Configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-1.5-flash',
    maxTokens: 1000,
    temperature: 0.7
  },

  // Email Configuration
  email: {
    gmail: process.env.GMAIL_EMAIL,
    service: 'gmail'
  },

  // Bot Behavior Configuration
  bot: {
    delayMin: parseInt(process.env.DELAY_MIN_MS) || 2000,
    delayMax: parseInt(process.env.DELAY_MAX_MS) || 5000,
    humanTypingDelay: parseInt(process.env.HUMAN_TYPING_DELAY) || 100,
    maxApplicationsPerDay: parseInt(process.env.MAX_APPLICATIONS_PER_DAY) || 10,
    delayBetweenApplications: parseInt(process.env.DELAY_BETWEEN_APPLICATIONS) || 30, // minutes
    cooldownBetweenActions: parseInt(process.env.COOLDOWN_BETWEEN_ACTIONS) || 3000,
    senderName: process.env.SENDER_NAME || 'Job Seeker'
  },

  // Job Search Configuration
  jobSearch: {
    keywords: (process.env.JOB_KEYWORDS || '').split(',').map(k => k.trim()).filter(k => k),
    defaultKeywords: [
      'software developer hiring',
      'react native developer hiring', 
      'backend developer hiring',
      'frontend developer hiring',
      'react developer hiring'
    ]
  },

  // Browser Configuration
  browser: {
    headless: process.env.HEADLESS_MODE === 'true',
    viewport: {
      width: parseInt(process.env.VIEWPORT_WIDTH) || 1366,
      height: parseInt(process.env.VIEWPORT_HEIGHT) || 768
    },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/linkedin-bot.log'
  },

  // Email Templates
  emailTemplates: {
    subject: 'Interest in {position} - Software Developer',
    greeting: 'Dear Hiring Manager,',
    closing: 'Best regards,\nYour Name'
  },

  // Selectors (CSS selectors for LinkedIn elements)
  selectors: {
    loginEmail: '#username',
    loginPassword: '#password',
    loginButton: '.login__form_action_container button[type="submit"]',
    searchBox: 'input[placeholder*="Search"]',
    searchButton: 'button[data-test-app-aware-link=""]',
    postContainer: '.feed-shared-update-v2',
    postContent: '.feed-shared-text',
    emailLinks: 'a[href^="mailto:"]',
    loadMoreButton: 'button[aria-label*="See more"]'
  }
};

// Validation
const validateConfig = () => {
  const required = [
    'linkedin.email',
    'linkedin.password', 
    'gemini.apiKey',
    'email.gmail'
  ];

  const missing = required.filter(path => {
    const value = path.split('.').reduce((obj, key) => obj?.[key], config);
    return !value;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
};

module.exports = { config, validateConfig }; 