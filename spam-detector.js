import { GoogleGenerativeAI } from '@google/generative-ai';

class SpamDetector {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: 'text/plain',
      }
    });
    
    this.systemPrompt = `You are a cybersecurity expert trained to detect scam messages, phishing attempts, and suspicious communications. You must analyze any message given and return whether it is a SCAM or NOT A SCAM, with a short explanation why. Be strict about scam patterns like:

- Fake links or suspicious URLs
- Urgency tactics ("Act now!", "Limited time!")
- Prize claims or lottery winnings
- Requests for sensitive information (passwords, SSN, bank details)
- Impersonation of legitimate companies
- Poor grammar/spelling from supposed official sources
- Unexpected attachments or downloads
- Romance scams or emotional manipulation
- Investment scams or get-rich-quick schemes
- Tech support scams

Format your response as:
VERDICT: [SCAM/NOT A SCAM]
CONFIDENCE: [High/Medium/Low]
EXPLANATION: [Brief explanation of why this is or isn't a scam]
RED FLAGS: [List any suspicious elements found]`;
  }

  async analyzeMessage(message) {
    try {
      const prompt = `${this.systemPrompt}\n\nAnalyze this message:\n\n"${message}"`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error analyzing message:', error);
      return 'Error: Unable to analyze message';
    }
  }

  async analyzeEmail(subject, body, sender = '') {
    const emailContent = `
Subject: ${subject}
From: ${sender}
Body: ${body}
    `.trim();
    
    return await this.analyzeMessage(emailContent);
  }

  async analyzeLink(url, context = '') {
    const linkContent = `
URL: ${url}
Context: ${context}
    `.trim();
    
    return await this.analyzeMessage(linkContent);
  }
}

// Example usage and testing
async function runTests() {
  const detector = new SpamDetector();
  
  console.log('🔍 GEMINI SPAM DETECTOR INITIALIZED\n');
  console.log('=' .repeat(60));
  
  // Test 1: Obvious phishing email
  console.log('\n📧 TEST 1: Phishing Email');
  console.log('-'.repeat(30));
  const phishingResult = await detector.analyzeEmail(
    "URGENT: Your PayPal account has been suspended",
    "Dear Customer, Your PayPal account has been suspended due to suspicious activity. Click here immediately to verify your account: http://paypal-security-update.fake-site.com/login. You have 24 hours or your account will be permanently closed. Enter your full login credentials and SSN to restore access.",
    "security@paypal-support.com"
  );
  console.log(phishingResult);

  // Test 2: Legitimate email
  console.log('\n📧 TEST 2: Legitimate Email');
  console.log('-'.repeat(30));
  const legitimateResult = await detector.analyzeEmail(
    "Your order confirmation #12345",
    "Thank you for your purchase! Your order #12345 has been confirmed and will be shipped within 2-3 business days. You can track your order at amazon.com/orders using your account. If you have any questions, please contact customer service.",
    "orders@amazon.com"
  );
  console.log(legitimateResult);

  // Test 3: Romance scam
  console.log('\n💔 TEST 3: Romance Scam');
  console.log('-'.repeat(30));
  const romanceScamResult = await detector.analyzeMessage(
    "Hello my dear, I am Dr. Sarah Johnson, a widow from London. I have fallen in love with you from your profile. I have $2.5 million inheritance that I want to share with you. Please send me your bank details so I can transfer the money. I need someone trustworthy like you. Please reply urgently as I am very sick."
  );
  console.log(romanceScamResult);

  // Test 4: Suspicious link
  console.log('\n🔗 TEST 4: Suspicious Link');
  console.log('-'.repeat(30));
  const linkResult = await detector.analyzeLink(
    "http://microsoft-security-alert.tk/urgent-update.exe",
    "Received in email claiming to be from Microsoft about a security update"
  );
  console.log(linkResult);

  // Test 5: Investment scam
  console.log('\n💰 TEST 5: Investment Scam');
  console.log('-'.repeat(30));
  const investmentScamResult = await detector.analyzeMessage(
    "🚀 MAKE $5000 A DAY WITH CRYPTO! 🚀 Join our exclusive Bitcoin trading group! Guaranteed profits! No experience needed! Send $500 to get started and receive our secret trading algorithm. Limited spots available! Act now before it's too late! WhatsApp: +1-555-SCAM-123"
  );
  console.log(investmentScamResult);

  // Test 6: Tech support scam
  console.log('\n🖥️ TEST 6: Tech Support Scam');
  console.log('-'.repeat(30));
  const techScamResult = await detector.analyzeMessage(
    "WARNING: Your computer has been infected with 5 viruses! Your personal data is at risk! Call Microsoft Support immediately at 1-800-FAKE-TECH. Do not turn off your computer! Our certified technicians will remove the viruses remotely for only $299. Call now!"
  );
  console.log(techScamResult);

  console.log('\n' + '='.repeat(60));
  console.log('🎯 SPAM DETECTION ANALYSIS COMPLETE');
}

// Interactive function to analyze custom messages
async function analyzeCustomMessage() {
  const detector = new SpamDetector();
  
  // Example custom message - you can replace this with any message
  const customMessage = `
Subject: Congratulations! You've Won!
From: lottery@mega-millions-winner.com

Dear Lucky Winner,

CONGRATULATIONS! You have been selected as the winner of our international lottery! You have won $850,000 USD!

To claim your prize, please provide:
- Full name and address
- Phone number
- Copy of ID or passport
- Bank account details for transfer

Send this information to: claims@lottery-mega-win.net

You must respond within 48 hours or forfeit your winnings!

Best regards,
International Lottery Commission
  `.trim();

  console.log('🔍 ANALYZING CUSTOM MESSAGE');
  console.log('=' .repeat(50));
  console.log('MESSAGE:');
  console.log(customMessage);
  console.log('\n' + '-'.repeat(50));
  console.log('ANALYSIS RESULT:');
  
  const result = await detector.analyzeMessage(customMessage);
  console.log(result);
}

// Run the tests
console.log('Starting Gemini Spam Detector...\n');
await runTests();

console.log('\n\n🔍 CUSTOM MESSAGE ANALYSIS:');
await analyzeCustomMessage();
