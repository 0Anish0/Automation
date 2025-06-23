const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('../config/config');
const logger = require('../utils/logger');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: config.gemini.model });
  }

  /**
   * Generate a professional email based on job post content
   * @param {Object} jobData - Job post data
   * @param {string} jobData.content - Job post content
   * @param {string} jobData.company - Company name
   * @param {string} jobData.position - Position title
   * @param {string} jobData.email - Hiring manager's email
   * @returns {Promise<Object>} Generated email with subject and body
   */
  async generateJobApplicationEmail(jobData) {
    try {
      const prompt = this.createEmailPrompt(jobData);
      
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: config.gemini.temperature,
          maxOutputTokens: config.gemini.maxTokens,
          topP: 0.8,
          topK: 40
        }
      });

      const response = result.response;
      const emailContent = response.text();
      
      return this.parseEmailResponse(emailContent);
    } catch (error) {
      logger.error('Error generating email with Gemini:', error);
      return this.getFallbackEmail(jobData);
    }
  }

  /**
   * Create a detailed prompt for email generation
   * @param {Object} jobData - Job post data
   * @returns {string} AI prompt for email generation
   */
  createEmailPrompt(jobData) {
    return `
You are a professional email writer helping a software developer apply for jobs. 

Based on the following job posting, write a compelling and personalized job application email:

JOB POSTING CONTENT:
"${jobData.content}"

COMPANY: ${jobData.company || 'Not specified'}
POSITION: ${jobData.position || 'Software Developer'}
HIRING MANAGER EMAIL: ${jobData.email}

REQUIREMENTS:
1. Write a professional, engaging email that shows genuine interest
2. Highlight relevant skills mentioned in the job posting
3. Keep it concise (150-250 words)
4. Use a confident but not arrogant tone
5. Include a clear call to action
6. Make it personal, not generic

CANDIDATE BACKGROUND (use as reference):
- Experienced software developer
- Skills: JavaScript, React, Node.js, Python, React Native
- Experience with both frontend and backend development
- Strong problem-solving skills
- Experience with modern development practices

EMAIL FORMAT:
Subject: [Write compelling subject line]

Body:
[Write the email body]

Please generate a complete email that would stand out to hiring managers while remaining professional and authentic.
`;
  }

  /**
   * Parse the AI-generated email response
   * @param {string} emailContent - Raw AI response
   * @returns {Object} Parsed email with subject and body
   */
  parseEmailResponse(emailContent) {
    try {
      const lines = emailContent.split('\n').filter(line => line.trim());
      let subject = '';
      let body = '';
      let bodyStarted = false;

      for (const line of lines) {
        if (line.toLowerCase().startsWith('subject:')) {
          subject = line.replace(/^subject:\s*/i, '').trim();
        } else if (line.toLowerCase().includes('body:') || bodyStarted) {
          if (line.toLowerCase().includes('body:')) {
            bodyStarted = true;
            const bodyContent = line.replace(/^.*body:\s*/i, '').trim();
            if (bodyContent) {
              body += bodyContent + '\n';
            }
          } else {
            body += line + '\n';
          }
        }
      }

      // If no clear structure, treat everything after first line as body
      if (!subject && !body) {
        const allLines = emailContent.split('\n').filter(line => line.trim());
        subject = allLines[0] || 'Application for Software Developer Position';
        body = allLines.slice(1).join('\n').trim();
      }

      return {
        subject: subject || 'Application for Software Developer Position',
        body: (body || emailContent).trim(),
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error parsing email response:', error);
      return this.getFallbackEmail(jobData);
    }
  }

  /**
   * Generate a summary of a job post for decision making
   * @param {string} postContent - Full job post content
   * @returns {Promise<Object>} Job post analysis
   */
  async analyzeJobPost(postContent) {
    try {
      const prompt = `
Analyze this job posting and extract key information:

JOB POSTING:
"${postContent}"

Please provide:
1. Company name (if mentioned)
2. Position title
3. Key requirements
4. Technologies mentioned
5. Is this a legitimate job posting? (yes/no)
6. Relevance score for a software developer (1-10)
7. Any email addresses found

Format your response as JSON:
{
  "company": "company name or null",
  "position": "position title",
  "requirements": ["requirement1", "requirement2"],
  "technologies": ["tech1", "tech2"],
  "isLegitimate": true/false,
  "relevanceScore": number,
  "emails": ["email1", "email2"],
  "summary": "brief summary"
}
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      try {
        return JSON.parse(response);
      } catch (parseError) {
        logger.warn('Could not parse job analysis as JSON, returning raw response');
        return {
          company: null,
          position: 'Software Developer',
          requirements: [],
          technologies: [],
          isLegitimate: true,
          relevanceScore: 5,
          emails: [],
          summary: response
        };
      }
    } catch (error) {
      logger.error('Error analyzing job post:', error);
      return {
        company: null,
        position: 'Software Developer',
        requirements: [],
        technologies: [],
        isLegitimate: true,
        relevanceScore: 5,
        emails: [],
        summary: 'Could not analyze post'
      };
    }
  }

  /**
   * Generate follow-up email content
   * @param {Object} originalJobData - Original job data
   * @param {number} daysAfter - Days after original application
   * @returns {Promise<Object>} Follow-up email content
   */
  async generateFollowUpEmail(originalJobData, daysAfter = 7) {
    try {
      const prompt = `
Write a professional follow-up email for a job application sent ${daysAfter} days ago.

ORIGINAL APPLICATION CONTEXT:
Company: ${originalJobData.company || 'Not specified'}
Position: ${originalJobData.position || 'Software Developer'}

REQUIREMENTS:
1. Professional and polite tone
2. Brief reminder of original application
3. Reiterate interest and value proposition
4. Keep it short (100-150 words)
5. Include a subtle call to action

Format as:
Subject: [subject line]

Body:
[email body]
`;

      const result = await this.model.generateContent(prompt);
      const emailContent = result.response.text();
      
      return this.parseEmailResponse(emailContent);
    } catch (error) {
      logger.error('Error generating follow-up email:', error);
      return {
        subject: `Follow-up: ${originalJobData.position} Application`,
        body: `Dear Hiring Manager,\n\nI wanted to follow up on my application for the ${originalJobData.position} position at ${originalJobData.company} that I submitted ${daysAfter} days ago.\n\nI remain very interested in this opportunity and would welcome the chance to discuss how my skills and experience align with your team's needs.\n\nThank you for your consideration.\n\nBest regards,\nYour Name`,
        generatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Get fallback email when AI generation fails
   * @param {Object} jobData - Job data
   * @returns {Object} Fallback email
   */
  getFallbackEmail(jobData) {
    return {
      subject: `Application for ${jobData.position || 'Software Developer Position'}`,
      body: `Dear Hiring Manager,

I hope this email finds you well. I am writing to express my strong interest in the ${jobData.position || 'Software Developer'} position${jobData.company ? ` at ${jobData.company}` : ''}.

As an experienced software developer with expertise in modern web technologies including JavaScript, React, Node.js, and Python, I am excited about the opportunity to contribute to your team. My background in both frontend and backend development, combined with my passion for creating efficient and scalable solutions, makes me a strong candidate for this role.

I would welcome the opportunity to discuss how my skills and experience align with your team's needs. Please feel free to contact me at your convenience.

Thank you for considering my application. I look forward to hearing from you.

Best regards,
Your Name`,
      generatedAt: new Date().toISOString(),
      isFallback: true
    };
  }

  /**
   * Test the Gemini API connection
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      const result = await this.model.generateContent('Say "Hello, Gemini API is working!"');
      const response = result.response.text();
      logger.info('Gemini API test successful:', response);
      return true;
    } catch (error) {
      logger.error('Gemini API test failed:', error);
      return false;
    }
  }
}

module.exports = GeminiService; 