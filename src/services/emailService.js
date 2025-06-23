const { config } = require('../config/config');
const logger = require('../utils/logger');
const HumanBehavior = require('../utils/humanBehavior');

class EmailService {
  constructor(linkedinService) {
    this.linkedinService = linkedinService; // Reuse the same browser instance
    this.gmailPage = null;
    this.isInitialized = false;
    this.isGmailLoggedIn = false;
    this.dailyEmailCount = 0;
    this.lastEmailTime = null;
  }

  /**
   * Initialize Gmail email service with browser automation
   */
  async initialize() {
    try {
      logger.botAction('Initializing Gmail email service');
      
      // Validate email configuration
      if (!config.email.gmail) {
        throw new Error(`
Missing Gmail email configuration. Please ensure you have:
1. GMAIL_EMAIL set to your Gmail address

The bot will use browser automation to access Gmail directly.
        `);
      }

      // Make sure LinkedIn service browser is available
      if (!this.linkedinService || !this.linkedinService.browser) {
        throw new Error('LinkedIn service must be initialized first');
      }

      // Open Gmail in a new tab
      await this.openGmail();
      
      // Login to Gmail
      await this.loginToGmail();
      
      this.isInitialized = true;
      logger.botAction('Gmail email service initialized successfully');
      return true;
    } catch (error) {
      logger.botError('Gmail email service initialization', error);
      throw error;
    }
  }

  /**
   * Open Gmail in a new browser tab
   */
  async openGmail() {
    try {
      logger.botAction('Opening Gmail in new tab');
      
      // Create new page for Gmail
      this.gmailPage = await this.linkedinService.browser.newPage();
      
      // Set user agent and headers (same as LinkedIn)
      const userAgent = HumanBehavior.getRandomUserAgent();
      await this.gmailPage.setUserAgent(userAgent);
      
      await this.gmailPage.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });

      // Navigate to Gmail
      await this.gmailPage.goto('https://mail.google.com', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      await HumanBehavior.randomDelay(2000, 4000);
      logger.botAction('Gmail page opened successfully');
      
    } catch (error) {
      logger.botError('Open Gmail', error);
      throw error;
    }
  }

  /**
   * Login to Gmail
   */
  async loginToGmail() {
    try {
      logger.botAction('Starting Gmail login');
      
      const currentUrl = this.gmailPage.url();
      
      // Check if already logged in
      if (currentUrl.includes('mail.google.com/mail/')) {
        logger.botAction('Already logged into Gmail');
        this.isGmailLoggedIn = true;
        return true;
      }

      // Check if we need to enter email first
      if (currentUrl.includes('accounts.google.com') || currentUrl.includes('signin')) {
        // Enter email
        await this.gmailPage.waitForSelector('#identifierId', { timeout: 10000 });
        await HumanBehavior.realisticTypeText(this.gmailPage, '#identifierId', config.email.gmail);
        
        await HumanBehavior.randomDelay(1000, 2000);
        
        // Click Next
        await HumanBehavior.humanClick(this.gmailPage, '#identifierNext');
        
        await HumanBehavior.randomDelay(2000, 4000);
        
        // Wait for password field
        await this.gmailPage.waitForSelector('input[name="password"]', { timeout: 15000 });
        
        logger.botAction('GMAIL LOGIN REQUIRED: Please complete the login manually');
        logger.botAction('The bot will wait for 2 minutes for you to complete the login...');
        
        // Wait for manual login completion
        let loginCompleted = false;
        let attempts = 0;
        const maxAttempts = 120; // 2 minutes (120 seconds)
        
        while (!loginCompleted && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
          
          try {
            const currentUrl = this.gmailPage.url();
            if (currentUrl.includes('mail.google.com/mail/')) {
              loginCompleted = true;
              logger.botAction('Gmail login completed successfully');
              this.isGmailLoggedIn = true;
              break;
            }
          } catch (error) {
            // Continue waiting
          }
        }
        
        if (!loginCompleted) {
          throw new Error('Gmail login timeout - please complete login manually');
        }
        
      } else {
        // Already on Gmail main page
        this.isGmailLoggedIn = true;
      }
      
      return true;
    } catch (error) {
      logger.botError('Gmail login', error);
      throw error;
    }
  }

  /**
   * Send a job application email using Gmail web interface
   * @param {Object} emailData - Email data from Gemini AI
   * @param {string} recipientEmail - Recipient email address
   * @param {Object} jobData - Original job data
   * @returns {Promise<boolean>} Success status
   */
  async sendJobApplicationEmail(emailData, recipientEmail, jobData = {}) {
    try {
      if (!this.isInitialized || !this.isGmailLoggedIn) {
        throw new Error('Gmail service not initialized or not logged in');
      }

      // Rate limiting check
      if (!this.canSendEmail()) {
        logger.rateLimited('Email sending', this.getNextAllowedTime());
        return false;
      }

      logger.botAction('Preparing to send job application email via Gmail', {
        to: recipientEmail,
        subject: emailData.subject
      });

      // Add human-like delay before composing
      await HumanBehavior.randomDelay(2000, 5000);

      // Compose and send email through Gmail interface
      const success = await this.composeAndSendEmail(recipientEmail, emailData.subject, emailData.body);
      
      if (success) {
        // Update tracking
        this.updateEmailTracking();
        
        // Log success
        logger.emailSent(recipientEmail, emailData.subject, true, {
          company: jobData.company,
          position: jobData.position,
          isAIGenerated: !emailData.isFallback,
          method: 'gmail_browser'
        });

        // Save sent email for tracking
        await this.saveSentEmail(emailData, recipientEmail, jobData, { method: 'gmail_browser' });
      }

      return success;
    } catch (error) {
      logger.emailSent(recipientEmail, emailData.subject, false, {
        error: error.message,
        company: jobData.company,
        position: jobData.position
      });
      
      logger.botError('Send job application email', error, {
        recipient: recipientEmail
      });
      
      return false;
    }
  }

  /**
   * Compose and send email through Gmail web interface
   */
  async composeAndSendEmail(recipientEmail, subject, body) {
    try {
      logger.botAction('Composing email in Gmail interface');
      
      // Click compose button
      await this.gmailPage.waitForSelector('[gh="cm"]', { timeout: 10000 });
      await HumanBehavior.humanClick(this.gmailPage, '[gh="cm"]');
      
      await HumanBehavior.randomDelay(2000, 3000);
      
      // Wait for compose window
      await this.gmailPage.waitForSelector('input[name="to"]', { timeout: 10000 });
      
      // Fill recipient
      await HumanBehavior.realisticTypeText(this.gmailPage, 'input[name="to"]', recipientEmail);
      await HumanBehavior.randomDelay(1000, 2000);
      
      // Fill subject
      await HumanBehavior.realisticTypeText(this.gmailPage, 'input[name="subjectbox"]', subject);
      await HumanBehavior.randomDelay(1000, 2000);
      
      // Fill body
      const bodySelector = '[role="textbox"][aria-label*="Message Body"]';
      await this.gmailPage.waitForSelector(bodySelector, { timeout: 10000 });
      await HumanBehavior.humanClick(this.gmailPage, bodySelector);
      await HumanBehavior.realisticTypeText(this.gmailPage, bodySelector, body);
      
      await HumanBehavior.randomDelay(2000, 4000);
      
      // Send email
      const sendButton = '[role="button"][aria-label*="Send"]';
      await this.gmailPage.waitForSelector(sendButton, { timeout: 5000 });
      await HumanBehavior.humanClick(this.gmailPage, sendButton);
      
      // Wait for send confirmation
      await HumanBehavior.randomDelay(3000, 5000);
      
      logger.botAction('Email sent successfully through Gmail');
      return true;
      
    } catch (error) {
      logger.botError('Compose and send email', error);
      
      // Try to close compose window if it's open
      try {
        const closeButton = '[role="button"][aria-label*="Close"]';
        const closeExists = await this.gmailPage.$(closeButton);
        if (closeExists) {
          await HumanBehavior.humanClick(this.gmailPage, closeButton);
        }
      } catch (closeError) {
        // Ignore close errors
      }
      
      return false;
    }
  }

  /**
   * Send a follow-up email
   */
  async sendFollowUpEmail(emailData, recipientEmail, originalJobData = {}) {
    try {
      if (!this.canSendEmail()) {
        logger.rateLimited('Follow-up email sending', this.getNextAllowedTime());
        return false;
      }

      logger.botAction('Sending follow-up email via Gmail', {
        to: recipientEmail,
        subject: emailData.subject
      });

      await HumanBehavior.randomDelay(1000, 3000);

      const success = await this.composeAndSendEmail(recipientEmail, emailData.subject, emailData.body);
      
      if (success) {
        this.updateEmailTracking();
        logger.emailSent(recipientEmail, emailData.subject, true, {
          type: 'follow-up',
          method: 'gmail_browser'
        });
      }

      return success;
    } catch (error) {
      logger.botError('Send follow-up email', error, { recipient: recipientEmail });
      return false;
    }
  }

  /**
   * Check if email can be sent (rate limiting)
   */
  canSendEmail() {
    // Check daily limit
    if (this.dailyEmailCount >= config.bot.maxApplicationsPerDay) {
      return false;
    }

    // Check time-based rate limiting
    if (this.lastEmailTime) {
      const timeSinceLastEmail = Date.now() - this.lastEmailTime;
      const minDelay = config.bot.delayBetweenApplications * 60 * 1000; // Convert minutes to milliseconds
      
      if (timeSinceLastEmail < minDelay) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get next allowed email time
   */
  getNextAllowedTime() {
    if (this.dailyEmailCount >= config.bot.maxApplicationsPerDay) {
      // Return tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    }

    if (this.lastEmailTime) {
      const minDelay = config.bot.delayBetweenApplications * 60 * 1000;
      return new Date(this.lastEmailTime + minDelay);
    }

    return new Date();
  }

  /**
   * Update email tracking counters
   */
  updateEmailTracking() {
    this.dailyEmailCount++;
    this.lastEmailTime = Date.now();
    
    // Reset daily count if it's a new day
    const lastEmailDate = new Date(this.lastEmailTime).toDateString();
    const currentDate = new Date().toDateString();
    
    if (lastEmailDate !== currentDate) {
      this.dailyEmailCount = 1;
    }

    logger.botAction('Email tracking updated', {
      dailyCount: this.dailyEmailCount,
      maxDaily: config.bot.maxApplicationsPerDay,
      lastEmailTime: new Date(this.lastEmailTime).toISOString()
    });
  }

  /**
   * Generate message ID for tracking
   */
  generateMessageId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `linkedin-bot-${timestamp}-${random}@gmail.com`;
  }

  /**
   * Get sender name from config
   */
  getFromName() {
    return config.bot.senderName || 'Job Seeker';
  }

  /**
   * Save sent email for tracking
   */
  async saveSentEmail(emailData, recipientEmail, jobData, sendInfo) {
    try {
      const fs = require('fs-extra');
      const path = require('path');
      
      const sentEmail = {
        id: this.generateMessageId(),
        timestamp: new Date().toISOString(),
        recipient: recipientEmail,
        subject: emailData.subject,
        body: emailData.body,
        company: jobData.company,
        position: jobData.position,
        searchKeyword: jobData.searchKeyword,
        method: sendInfo.method || 'gmail_browser',
        isAIGenerated: !emailData.isFallback
      };

      // Ensure data directory exists
      const dataDir = path.join(__dirname, '../../data');
      await fs.ensureDir(dataDir);
      
      // Save to daily sent emails file  
      const today = new Date().toISOString().split('T')[0];
      const sentEmailsFile = path.join(dataDir, `sent-emails-${today}.json`);
      
      let sentEmails = [];
      try {
        if (await fs.pathExists(sentEmailsFile)) {
          sentEmails = await fs.readJSON(sentEmailsFile);
        }
      } catch (error) {
        logger.botError('Read sent emails file', error);
      }
      
      sentEmails.push(sentEmail);
      await fs.writeJSON(sentEmailsFile, sentEmails, { spaces: 2 });
      
      logger.botAction('Sent email saved to tracking file', {
        file: sentEmailsFile,
        totalSentToday: sentEmails.length
      });
      
    } catch (error) {
      logger.botError('Save sent email', error);
    }
  }

  /**
   * Get email statistics
   */
  async getEmailStats() {
    try {
      const fs = require('fs-extra');
      const path = require('path');
      
      const dataDir = path.join(__dirname, '../../data');
      const today = new Date().toISOString().split('T')[0];
      const sentEmailsFile = path.join(dataDir, `sent-emails-${today}.json`);
      
      if (await fs.pathExists(sentEmailsFile)) {
        const sentEmails = await fs.readJSON(sentEmailsFile);
        
        return {
          todayCount: sentEmails.length,
          dailyLimit: config.bot.maxApplicationsPerDay,
          remaining: Math.max(0, config.bot.maxApplicationsPerDay - sentEmails.length),
          lastSent: sentEmails.length > 0 ? sentEmails[sentEmails.length - 1].timestamp : null,
          canSendMore: this.canSendEmail()
        };
      }
      
      return {
        todayCount: 0,
        dailyLimit: config.bot.maxApplicationsPerDay,
        remaining: config.bot.maxApplicationsPerDay,
        lastSent: null,
        canSendMore: true
      };
    } catch (error) {
      logger.botError('Get email stats', error);
      return {
        todayCount: 0,
        dailyLimit: config.bot.maxApplicationsPerDay,
        remaining: config.bot.maxApplicationsPerDay,
        lastSent: null,
        canSendMore: true
      };
    }
  }

  /**
   * Test Gmail configuration and connection
   */
  async testEmailConfiguration() {
    try {
      logger.botAction('Testing Gmail configuration');
      
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Test by checking if we can access Gmail interface
      await this.gmailPage.goto('https://mail.google.com/mail/u/0/#inbox', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      const title = await this.gmailPage.title();
      const isGmailPage = title.includes('Gmail') || title.includes('Inbox');
      
      if (isGmailPage) {
        logger.botAction('Gmail configuration test successful');
        return { success: true, message: 'Gmail access confirmed' };
      } else {
        throw new Error('Gmail page not accessible');
      }
      
    } catch (error) {
      logger.botError('Gmail configuration test', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Cleanup Gmail resources
   */
  async cleanup() {
    try {
      logger.botAction('Cleaning up Gmail email service');
      
      if (this.gmailPage) {
        await this.gmailPage.close();
        this.gmailPage = null;
      }
      
      this.isInitialized = false;
      this.isGmailLoggedIn = false;
      
      logger.botAction('Gmail email service cleanup completed');
    } catch (error) {
      logger.botError('Gmail cleanup', error);
    }
  }
}

module.exports = EmailService; 