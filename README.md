# LinkedIn Job Automation Bot 🤖

> **AI-Powered Job Application Automation with Human-like Behavior**

An intelligent LinkedIn automation bot that searches for job opportunities, analyzes job posts using Google Gemini AI, and automatically sends personalized application emails with human-like behavior patterns to avoid detection.

## ✨ Features

- 🔍 **Intelligent Job Search**: Automated search with customizable keywords
- 🤖 **AI-Powered Email Generation**: Uses Google Gemini to create personalized application emails
- 👤 **Human-like Behavior**: Simulates natural browsing patterns to avoid bot detection
- 📧 **Email Automation**: Automatically sends applications via Gmail
- 📊 **Comprehensive Logging**: Detailed logs and session reports
- 🛡️ **Rate Limiting**: Built-in safety measures to prevent account restrictions
- 🎯 **Smart Job Filtering**: AI analyzes job relevance and legitimacy

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- Gmail account with app password enabled
- LinkedIn account  
- Google Gemini API key

### Installation

1. **Clone and Setup**
   ```bash
   cd linkedin-bot
   npm install
   ```

2. **Run Setup Wizard**
   ```bash
   npm run setup
   ```
   The wizard will guide you through configuring:
   - LinkedIn credentials
   - Gemini API key
   - Gmail settings
   - Job search preferences

3. **Test Your Configuration**
   ```bash
   npm run test
   ```

4. **Start the Bot**
   ```bash
   npm start
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file (or use the setup wizard):

```env
# LinkedIn Account
LINKEDIN_EMAIL=your-email@example.com
LINKEDIN_PASSWORD=your-password

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Gmail Configuration  
GMAIL_EMAIL=your-gmail@example.com
GMAIL_APP_PASSWORD=your-app-password

# Job Search Keywords
JOB_KEYWORDS=software developer hiring,react developer hiring,backend developer hiring

# Bot Behavior
MAX_SEARCH_RESULTS=10
MAX_APPLICATIONS_PER_DAY=10
HEADLESS_MODE=false
DELAY_MIN_MS=2000
DELAY_MAX_MS=5000
```

### Job Search Keywords

Customize your job search by modifying the `JOB_KEYWORDS` in your `.env` file:

```env
JOB_KEYWORDS=software engineer hiring,full stack developer,react native developer,python developer,node.js developer
```

## 🛠️ Usage

### Commands

- `npm start` - Run the full automation
- `npm run test` - Run a test cycle with limited scope
- `npm run setup` - Launch the setup wizard
- `npm run dev` - Run in development mode with auto-restart

### Command Line Options

```bash
# Full automation
npm start

# Test mode (limited applications)
npm start test

# Show help
npm start help
```

## 🏗️ Architecture

```
linkedin-bot/
├── src/
│   ├── bot/
│   │   └── linkedinBot.js     # Main bot orchestrator
│   ├── services/
│   │   ├── linkedinService.js # LinkedIn automation
│   │   ├── geminiService.js   # AI email generation
│   │   └── emailService.js    # Gmail automation
│   ├── utils/
│   │   ├── humanBehavior.js   # Human-like behavior simulation
│   │   └── logger.js          # Comprehensive logging
│   ├── config/
│   │   └── config.js          # Configuration management
│   └── index.js               # Application entry point
├── scripts/
│   └── setup.js               # Setup wizard
├── logs/                      # Application logs
├── screenshots/               # Debug screenshots
├── reports/                   # Session reports
├── data/                      # Email tracking data
└── README.md
```

## 🤖 How It Works

1. **Login & Setup**: Securely logs into LinkedIn using stealth techniques
2. **Job Search**: Searches for jobs using your specified keywords
3. **Content Analysis**: Uses Gemini AI to analyze job posts for relevance
4. **Email Generation**: Creates personalized application emails using AI
5. **Human Simulation**: Applies random delays and browsing patterns
6. **Email Sending**: Automatically sends applications via Gmail
7. **Tracking**: Logs all activities and generates detailed reports

## 🛡️ Safety Features

### Anti-Detection Measures
- Random delays between actions (2-5 seconds)
- Human-like mouse movements and scrolling
- Realistic typing speeds with occasional pauses
- User-agent rotation and header spoofing
- Request rate limiting

### Built-in Safeguards
- Daily application limits (default: 10)
- Minimum cooldown between emails (default: 3 seconds)
- Account activity monitoring
- Automatic session cleanup
- Error recovery mechanisms

## 📊 Monitoring & Reports

### Real-time Logging
All activities are logged with different levels:
- `info`: General operations
- `warn`: Potential issues
- `error`: Failures and exceptions
- `debug`: Detailed debugging information

### Session Reports
After each run, the bot generates detailed reports including:
- Jobs found and processed
- Emails sent successfully
- Error statistics
- Performance metrics
- Company statistics

Reports are saved in the `reports/` directory.

## 🔧 Customization

### Email Templates
Modify the AI prompts in `src/services/geminiService.js` to customize:
- Email tone and style
- Professional background emphasis
- Call-to-action messages

### Behavior Patterns
Adjust human-like behavior in `src/utils/humanBehavior.js`:
- Typing speeds
- Mouse movement patterns
- Scrolling behavior
- Pause frequencies

### Job Filtering
Customize job relevance criteria in `src/services/linkedinService.js`:
- Job indicators
- Company name extraction
- Email filtering rules

## 🚨 Important Notes

### LinkedIn Terms of Service
- This bot is for educational and personal use only
- Always comply with LinkedIn's Terms of Service
- Use reasonable limits to avoid account restrictions
- Monitor your account for any security warnings

### Best Practices
- Start with small limits (2-3 applications) to test
- Use non-headless mode initially to monitor behavior
- Keep your LinkedIn profile updated and professional
- Review generated emails before the bot sends them (in test mode)

### Rate Limiting
- Default maximum: 10 applications per day
- Minimum 3-second delay between actions
- Built-in monitoring prevents excessive usage

## 🔍 Troubleshooting

### Common Issues

**Bot gets detected/blocked:**
- Increase delays in configuration
- Use non-headless mode to monitor behavior
- Reduce daily application limits
- Check for CAPTCHA challenges

**Login fails:**
- Verify LinkedIn credentials
- Check for 2FA requirements
- Monitor for security challenges
- Try logging in manually first

**Emails not sending:**
- Verify Gmail app password is correct
- Check Gmail SMTP settings
- Ensure 2FA is enabled on Gmail
- Test email configuration: `npm run setup test`

**No jobs found:**
- Adjust job search keywords
- Check LinkedIn search results manually
- Verify job post selectors are current
- Increase MAX_SEARCH_RESULTS

### Debug Mode

Run with detailed logging:
```bash
LOG_LEVEL=debug npm start
```

Take screenshots during execution:
```bash
# The bot automatically takes screenshots on errors
# Manual screenshots can be triggered in the code
```

## 📋 TODO / Roadmap

- [ ] Web dashboard for monitoring and control
- [ ] Database integration for better data management  
- [ ] Multi-platform job board support (Indeed, Glassdoor)
- [ ] Resume attachment functionality
- [ ] Advanced job matching algorithms
- [ ] Webhook notifications for applications sent
- [ ] Browser extension for manual control

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## ⚠️ Disclaimer

This software is provided for educational purposes only. Users are responsible for:
- Complying with LinkedIn's Terms of Service
- Following applicable laws and regulations
- Using the software ethically and responsibly
- Monitoring their account activity

The authors are not responsible for any account restrictions, suspensions, or other consequences resulting from the use of this software.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Puppeteer](https://github.com/puppeteer/puppeteer) for browser automation
- [Google Generative AI](https://ai.google.dev/) for intelligent email generation
- [Winston](https://github.com/winstonjs/winston) for comprehensive logging
- [Nodemailer](https://nodemailer.com/) for email automation

---

**Happy Job Hunting!** 🎯

*Remember: Quality over quantity. Focus on relevant opportunities and maintain professional standards.* 