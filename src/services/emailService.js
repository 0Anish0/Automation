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
   * Initialize email service
   */
  async initialize() {
    try {
      logger.botAction('Initializing email service');
      
      // Validate email configuration
      if (!config.email.gmail || !config.email.appPassword) {
        throw new Error(`
Missing email configuration. Please ensure you have:
1. GMAIL_EMAIL set to your Gmail address
2. GMAIL_APP_PASSWORD set to your Gmail app password (not regular password)

To generate an app password:
1. Enable 2-Factor Authentication on your Google account
2. Go to https://myaccount.google.com/security
3. Under "Signing in to Google", select "App passwords"
4. Generate a new app password for "Mail"
5. Use that 16-character password as GMAIL_APP_PASSWORD
        `);
      }

      // Create transporter with enhanced configuration
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: config.email.gmail,
          pass: config.email.appPassword
        },
        tls: {
          rejectUnauthorized: false
        },
        debug: false, // Set to true for debugging
        logger: false // Set to true for detailed logs
      });

      // Test the connection
      await this.testConnection();
      
      this.isInitialized = true;
      logger.botAction('Email service initialized successfully');
      return true;
    } catch (error) {
      logger.botError('Email service initialization', error);
      
      // Provide helpful error messages
      if (error.message.includes('535-5.7.8')) {
        console.log(`
❌ Gmail Authentication Failed!

This usually means:
1. You're using your regular Gmail password instead of an App Password
2. 2-Factor Authentication is not enabled
3. App Password is incorrect

SOLUTION:
1. Enable 2FA on your Google account: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use the 16-character app password (not your regular password)
4. Update your .env file with: GMAIL_APP_PASSWORD=your-app-password

Current email in config: ${config.email.gmail}
        `);
      }
      
      throw error;
    }
  }

  /**
   * Test email connection
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      logger.botAction('Email connection test successful');
      return true;
    } catch (error) {
      logger.botError('Email connection test failed', error);
      throw error;
    }
  }

  /**
   * Send a job application email
   * @param {Object} emailData - Email data from Gemini AI
   * @param {string} recipientEmail - Recipient email address
   * @param {Object} jobData - Original job data
   * @returns {Promise<boolean>} Success status
   */
  async sendJobApplicationEmail(emailData, recipientEmail, jobData = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Email service not initialized');
      }

      // Rate limiting check
      if (!this.canSendEmail()) {
        logger.rateLimited('Email sending', this.getNextAllowedTime());
        return false;
      }

      logger.botAction('Preparing to send job application email', {
        to: recipientEmail,
        subject: emailData.subject
      });

      // Add human-like delay before sending
      await HumanBehavior.randomDelay(2000, 5000);

      const mailOptions = {
        from: {
          name: this.getFromName(),
          address: config.email.gmail
        },
        to: recipientEmail,
        subject: emailData.subject,
        text: emailData.body,
        html: this.formatEmailAsHTML(emailData.body),
        headers: {
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal'
        },
        messageId: this.generateMessageId(),
        date: new Date()
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      
      // Update tracking
      this.updateEmailTracking();
      
      // Log success
      logger.emailSent(recipientEmail, emailData.subject, true, {
        messageId: info.messageId,
        company: jobData.company,
        position: jobData.position,
        isAIGenerated: !emailData.isFallback
      });

      // Save sent email for tracking
      await this.saveSentEmail(emailData, recipientEmail, jobData, info);

      return true;
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
   * Send a follow-up email
   * @param {Object} emailData - Follow-up email data
   * @param {string} recipientEmail - Recipient email address
   * @param {Object} originalJobData - Original job application data
   * @returns {Promise<boolean>} Success status
   */
  async sendFollowUpEmail(emailData, recipientEmail, originalJobData = {}) {
    try {
      if (!this.canSendEmail()) {
        logger.rateLimited('Follow-up email sending', this.getNextAllowedTime());
        return false;
      }

      logger.botAction('Sending follow-up email', {
        to: recipientEmail,
        subject: emailData.subject
      });

      await HumanBehavior.randomDelay(1000, 3000);

      const mailOptions = {
        from: {
          name: this.getFromName(),
          address: config.email.gmail
        },
        to: recipientEmail,
        subject: emailData.subject,
        text: emailData.body,
        html: this.formatEmailAsHTML(emailData.body),
        headers: {
          'X-Priority': '3',
          'In-Reply-To': originalJobData.originalMessageId || '',
          'References': originalJobData.originalMessageId || ''
        }
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.updateEmailTracking();

      logger.emailSent(recipientEmail, emailData.subject, true, {
        messageId: info.messageId,
        type: 'follow-up',
        originalApplication: originalJobData.id
      });

      return true;
    } catch (error) {
      logger.botError('Send follow-up email', error, {
        recipient: recipientEmail
      });
      return false;
    }
  }

  /**
   * Check if we can send an email (rate limiting)
   * @returns {boolean} Can send status
   */
  canSendEmail() {
    const now = Date.now();
    
    // Check daily limit
    if (this.dailyEmailCount >= config.bot.maxApplicationsPerDay) {
      return false;
    }

    // Check time-based rate limiting
    if (this.lastEmailTime) {
      const timeSinceLastEmail = now - this.lastEmailTime;
      const minInterval = config.bot.cooldownBetweenActions;
      
      if (timeSinceLastEmail < minInterval) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get next allowed time for sending email
   * @returns {number} Timestamp of next allowed send
   */
  getNextAllowedTime() {
    if (!this.lastEmailTime) {
      return Date.now();
    }
    
    return this.lastEmailTime + config.bot.cooldownBetweenActions;
  }

  /**
   * Update email tracking counters
   */
  updateEmailTracking() {
    this.dailyEmailCount++;
    this.lastEmailTime = Date.now();
    
    // Reset daily counter at midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    
    setTimeout(() => {
      this.dailyEmailCount = 0;
      logger.botAction('Daily email counter reset');
    }, midnight.getTime() - now.getTime());
  }

  /**
   * Format email body as HTML
   * @param {string} textBody - Plain text email body
   * @returns {string} HTML formatted email
   */
  formatEmailAsHTML(textBody) {
    // Simple text to HTML conversion
    return textBody
      .split('\n\n')
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph)
      .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  }

  /**
   * Generate a unique message ID
   * @returns {string} Message ID
   */
  generateMessageId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const domain = config.email.gmail.split('@')[1];
    return `<${timestamp}.${random}@${domain}>`;
  }

  /**
   * Get sender name (can be customized)
   * @returns {string} Sender name
   */
  getFromName() {
    // You can customize this based on your profile
    return process.env.SENDER_NAME || 'Software Developer';
  }

  /**
   * Save sent email details for tracking
   * @param {Object} emailData - Email content data
   * @param {string} recipientEmail - Recipient email
   * @param {Object} jobData - Job data
   * @param {Object} sendInfo - Nodemailer send info
   */
  async saveSentEmail(emailData, recipientEmail, jobData, sendInfo) {
    try {
      const emailRecord = {
        id: Date.now().toString(),
        messageId: sendInfo.messageId,
        to: recipientEmail,
        subject: emailData.subject,
        body: emailData.body,
        sentAt: new Date().toISOString(),
        jobData: {
          company: jobData.company,
          position: jobData.position,
          searchKeyword: jobData.searchKeyword,
          postUrl: jobData.postUrl
        },
        isAIGenerated: !emailData.isFallback,
        status: 'sent'
      };

      // Save to a JSON file for now (you can implement database later)
      const fs = require('fs-extra');
      const path = require('path');
      
      const dataDir = path.join(__dirname, '../../data');
      await fs.ensureDir(dataDir);
      
      const emailsFile = path.join(dataDir, 'sent-emails.json');
      
      let existingEmails = [];
      try {
        if (await fs.pathExists(emailsFile)) {
          existingEmails = await fs.readJSON(emailsFile);
        }
      } catch (error) {
        logger.warn('Could not read existing emails file');
      }

      existingEmails.push(emailRecord);
      await fs.writeJSON(emailsFile, existingEmails, { spaces: 2 });
      
      logger.botAction('Email record saved', { 
        emailId: emailRecord.id,
        recipient: recipientEmail 
      });
    } catch (error) {
      logger.botError('Save sent email', error);
    }
  }

  /**
   * Get sent email statistics
   * @returns {Promise<Object>} Email statistics
   */
  async getEmailStats() {
    try {
      const fs = require('fs-extra');
      const path = require('path');
      const emailsFile = path.join(__dirname, '../../data/sent-emails.json');
      
      if (!(await fs.pathExists(emailsFile))) {
        return {
          totalSent: 0,
          todaySent: 0,
          successRate: 0,
          companies: []
        };
      }

      const emails = await fs.readJSON(emailsFile);
      const today = new Date().toDateString();
      
      const todayEmails = emails.filter(email => 
        new Date(email.sentAt).toDateString() === today
      );

      const companies = [...new Set(emails.map(email => 
        email.jobData.company
      ).filter(Boolean))];

      return {
        totalSent: emails.length,
        todaySent: todayEmails.length,
        currentDailyCount: this.dailyEmailCount,
        maxDailyLimit: config.bot.maxApplicationsPerDay,
        companies: companies.slice(0, 10), // Top 10 companies
        lastSentAt: emails.length > 0 ? emails[emails.length - 1].sentAt : null
      };
    } catch (error) {
      logger.botError('Get email stats', error);
      return { totalSent: 0, todaySent: 0, successRate: 0, companies: [] };
    }
  }

  /**
   * Test email configuration
   * @returns {Promise<boolean>} Test success status
   */
  async testEmailConfiguration() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const testEmail = {
        from: config.email.gmail,
        to: config.email.gmail, // Send to self
        subject: 'LinkedIn Bot Email Test',
        text: 'This is a test email from your LinkedIn automation bot.',
        html: '<p>This is a test email from your LinkedIn automation bot.</p>'
      };

      const info = await this.transporter.sendMail(testEmail);
      
      logger.botAction('Test email sent successfully', {
        messageId: info.messageId
      });
      
      return true;
    } catch (error) {
      logger.botError('Test email configuration', error);
      return false;
    }
  }

  /**
   * Close email service connections
   */
  async cleanup() {
    try {
      if (this.transporter) {
        this.transporter.close();
      }
      logger.botAction('Email service cleanup completed');
    } catch (error) {
      logger.botError('Email service cleanup', error);
    }
  }
}

module.exports = EmailService; 