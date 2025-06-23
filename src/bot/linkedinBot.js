const { config, validateConfig } = require('../config/config');
const LinkedInService = require('../services/linkedinService');
const GeminiService = require('../services/geminiService');
const EmailService = require('../services/emailService');
const HumanBehavior = require('../utils/humanBehavior');
const logger = require('../utils/logger');
const randomstring = require('randomstring');

class LinkedInBot {
  constructor() {
    this.sessionId = randomstring.generate(8);
    this.linkedinService = new LinkedInService();
    this.geminiService = new GeminiService();
    this.emailService = new EmailService();
    
    this.stats = {
      session: {
        startTime: null,
        endTime: null,
        duration: 0
      },
      jobs: {
        found: 0,
        processed: 0,
        withEmails: 0,
        emailsSent: 0,
        errors: 0
      },
      keywords: {
        searched: 0,
        successful: 0
      }
    };

    this.isRunning = false;
    this.shouldStop = false;
  }

  /**
   * Initialize the bot and all services
   */
  async initialize() {
    try {
      logger.sessionStart(this.sessionId, {
        keywords: config.jobSearch.keywords,
        maxResults: config.linkedin.maxSearchResults,
        headless: config.browser.headless
      });

      // Validate configuration
      validateConfig();
      
      logger.botAction('Initializing LinkedIn Bot', { sessionId: this.sessionId });

      // Initialize all services
      await this.linkedinService.initialize();
      
      // TEMPORARILY SKIP EMAIL SERVICE - Focus on LinkedIn functionality first
      logger.botAction('Skipping email service initialization for LinkedIn testing');
      
      // Test Gemini API
      const geminiWorking = await this.geminiService.testConnection();
      if (!geminiWorking) {
        logger.security.blocked('Bot initialization', 'Gemini API test failed');
        return false;
      }

      logger.botAction('LinkedIn Bot initialized successfully');
      return true;
    } catch (error) {
      logger.botError('Bot initialization', error);
      return false;
    }
  }

  /**
   * Start the main bot automation process
   */
  async start() {
    try {
      if (this.isRunning) {
        logger.security.blocked('Bot start', 'Bot is already running');
        return false;
      }

      this.isRunning = true;
      this.shouldStop = false;
      this.stats.session.startTime = Date.now();

      logger.botAction('Starting LinkedIn Bot automation');

      // Step 1: Login to LinkedIn
      const loginSuccess = await this.linkedinService.login();
      if (!loginSuccess) {
        throw new Error('Failed to login to LinkedIn');
      }

      // Add human-like delay after login
      await HumanBehavior.randomDelay(5000, 10000);

      // Step 2: Search for jobs
      const keywords = config.jobSearch.keywords.length > 0 
        ? config.jobSearch.keywords 
        : config.jobSearch.defaultKeywords;

      const jobs = await this.searchForJobs(keywords);
      
      if (jobs.length === 0) {
        logger.botAction('No jobs found matching criteria');
        return false;
      }

      // Step 3: Process each job
      await this.processJobs(jobs);

      // Step 4: Generate session report
      await this.generateSessionReport();

      logger.botAction('LinkedIn Bot automation completed successfully');
      return true;

    } catch (error) {
      logger.botError('Bot automation', error);
      return false;
    } finally {
      this.isRunning = false;
      this.stats.session.endTime = Date.now();
      this.stats.session.duration = this.stats.session.endTime - this.stats.session.startTime;
      
      await this.cleanup();
    }
  }

  /**
   * Search for jobs with all keywords
   */
  async searchForJobs(keywords) {
    try {
      logger.botAction('Starting job search', { keywords: keywords.length });
      
      const allJobs = await this.linkedinService.searchJobs(keywords);
      
      this.stats.jobs.found = allJobs.length;
      this.stats.keywords.searched = keywords.length;
      this.stats.keywords.successful = keywords.length;

      logger.botAction('Job search completed', {
        totalJobs: allJobs.length,
        jobsWithEmails: allJobs.filter(job => job.hasEmails).length
      });

      return allJobs;
    } catch (error) {
      logger.botError('Job search', error);
      return [];
    }
  }

  /**
   * Process all found jobs
   */
  async processJobs(jobs) {
    try {
      logger.botAction('Starting job processing', { totalJobs: jobs.length });

      const jobsWithEmails = jobs.filter(job => job.hasEmails);
      this.stats.jobs.withEmails = jobsWithEmails.length;

      for (let i = 0; i < jobsWithEmails.length; i++) {
        if (this.shouldStop) {
          logger.botAction('Job processing stopped by user');
          break;
        }

        const job = jobsWithEmails[i];
        
        try {
          logger.botAction('Processing job', {
            index: i + 1,
            total: jobsWithEmails.length,
            company: job.company,
            emails: job.emails.length
          });

          await this.processIndividualJob(job);
          this.stats.jobs.processed++;

          // Human-like delay between jobs
          await HumanBehavior.randomDelay(10000, 20000);
          
          // Random browsing behavior
          await HumanBehavior.randomBrowsingBehavior(this.linkedinService.page);

        } catch (error) {
          logger.botError('Process individual job', error, { jobIndex: i });
          this.stats.jobs.errors++;
        }
      }

    } catch (error) {
      logger.botError('Job processing', error);
    }
  }

  /**
   * Process a single job posting
   */
  async processIndividualJob(job) {
    try {
      // Step 1: Analyze job post with Gemini AI
      const jobAnalysis = await this.geminiService.analyzeJobPost(job.content);
      
      // Check if job is relevant and legitimate
      if (!jobAnalysis.isLegitimate || jobAnalysis.relevanceScore < 5) {
        logger.jobProcessed(job, 'SKIPPED', false);
        return;
      }

      // Enhance job data with AI analysis
      const enhancedJob = {
        ...job,
        company: jobAnalysis.company || job.company,
        position: jobAnalysis.position,
        requirements: jobAnalysis.requirements,
        technologies: jobAnalysis.technologies,
        relevanceScore: jobAnalysis.relevanceScore
      };

      // Step 2: Log found emails (skip sending for now)
      if (job.emails && job.emails.length > 0) {
        logger.botAction('Found emails in job post', {
          company: enhancedJob.company,
          position: enhancedJob.position,
          emails: job.emails,
          relevanceScore: enhancedJob.relevanceScore
        });
        
        // TODO: Will implement email sending later
        logger.botAction('Email sending skipped - LinkedIn testing mode');
      } else {
        logger.botAction('No emails found in job post', {
          company: enhancedJob.company,
          position: enhancedJob.position
        });
      }

      logger.jobProcessed(enhancedJob, 'PROCESSED', true);

    } catch (error) {
      logger.botError('Process individual job', error);
      throw error;
    }
  }

  /**
   * Process a single email from a job posting
   */
  async processJobEmail(job, email) {
    try {
      logger.botAction('Processing job email', { email, company: job.company });

      // Step 1: Generate personalized email with Gemini AI
      const emailData = await this.geminiService.generateJobApplicationEmail({
        content: job.content,
        company: job.company,
        position: job.position,
        email: email
      });

      // Step 2: Send the email
      const emailSent = await this.emailService.sendJobApplicationEmail(
        emailData, 
        email, 
        job
      );

      if (emailSent) {
        this.stats.jobs.emailsSent++;
        logger.botAction('Job application email sent successfully', {
          recipient: email,
          company: job.company,
          subject: emailData.subject
        });
      }

      return emailSent;

    } catch (error) {
      logger.botError('Process job email', error, { email, company: job.company });
      return false;
    }
  }

  /**
   * Stop the bot gracefully
   */
  async stop() {
    logger.botAction('Stopping LinkedIn Bot');
    this.shouldStop = true;
    
    // Wait for current operation to complete
    let attempts = 0;
    while (this.isRunning && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (this.isRunning) {
      logger.security.blocked('Force stop', 'Bot did not stop gracefully');
      await this.cleanup();
    }

    logger.botAction('LinkedIn Bot stopped');
  }

  /**
   * Get current bot statistics
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      sessionId: this.sessionId,
      uptime: this.stats.session.startTime ? Date.now() - this.stats.session.startTime : 0
    };
  }

  /**
   * Generate session report
   */
  async generateSessionReport() {
    try {
      const emailStats = await this.emailService.getEmailStats();
      
      const report = {
        sessionId: this.sessionId,
        duration: this.stats.session.duration,
        summary: {
          jobsFound: this.stats.jobs.found,
          jobsProcessed: this.stats.jobs.processed,
          jobsWithEmails: this.stats.jobs.withEmails,
          emailsSent: this.stats.jobs.emailsSent,
          errors: this.stats.jobs.errors,
          successRate: this.stats.jobs.processed > 0 
            ? ((this.stats.jobs.emailsSent / this.stats.jobs.processed) * 100).toFixed(2) + '%'
            : '0%'
        },
        emailStats,
        completedAt: new Date().toISOString()
      };

      // Save report
      const fs = require('fs-extra');
      const path = require('path');
      const reportsDir = path.join(__dirname, '../../reports');
      await fs.ensureDir(reportsDir);
      
      const reportFile = path.join(reportsDir, `session-${this.sessionId}-${Date.now()}.json`);
      await fs.writeJSON(reportFile, report, { spaces: 2 });

      logger.sessionEnd(this.sessionId, report.summary);
      logger.botAction('Session report saved', { reportFile });

      return report;
    } catch (error) {
      logger.botError('Generate session report', error);
      return null;
    }
  }



  /**
   * Check if LinkedIn session is still valid
   */
  async checkSession() {
    try {
      return await this.linkedinService.checkLoginStatus();
    } catch (error) {
      logger.botError('Check session', error);
      return false;
    }
  }

  /**
   * Run a test cycle with limited scope
   */
  async runTest() {
    try {
      logger.botAction('Starting test run');
      
      // Initialize with test configurations
      const originalMaxResults = config.linkedin.maxSearchResults;
      const originalMaxEmails = config.bot.maxApplicationsPerDay;
      
      // Set test limits
      config.linkedin.maxSearchResults = 2;
      config.bot.maxApplicationsPerDay = 1;

      const success = await this.start();
      
      // Restore original config
      config.linkedin.maxSearchResults = originalMaxResults;
      config.bot.maxApplicationsPerDay = originalMaxEmails;
      
      return success;
    } catch (error) {
      logger.botError('Test run', error);
      return false;
    }
  }

  /**
   * Cleanup all resources
   */
  async cleanup() {
    try {
      logger.botAction('Starting bot cleanup');
      
      await this.linkedinService.cleanup();
      await this.emailService.cleanup();
      
      logger.botAction('Bot cleanup completed');
    } catch (error) {
      logger.botError('Bot cleanup', error);
    }
  }
}

module.exports = LinkedInBot; 