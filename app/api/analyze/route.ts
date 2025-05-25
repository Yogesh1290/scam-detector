import { GoogleGenerativeAI } from "@google/generative-ai"
import { type NextRequest, NextResponse } from "next/server"

const SYSTEM_PROMPT = `You are an elite cybersecurity expert and digital forensics specialist with 15+ years of experience in detecting scams, phishing attempts, and malicious communications. You have analyzed millions of threats and have an exceptional track record.

ANALYSIS REQUIREMENTS:
- Provide a verdict: SCAM, NOT A SCAM, or SUSPICIOUS
- Assign confidence level: High, Medium, or Low
- Give a risk score from 0-100 (0 = completely safe, 100 = definitely malicious)
- Provide clear explanation of your reasoning
- List specific red flags found
- Categorize the type of threat if applicable

DETECTION PATTERNS TO ANALYZE:
🚨 CRITICAL RED FLAGS:
- Urgent language ("Act now!", "Limited time!", "Expires today!")
- Requests for sensitive information (passwords, SSN, bank details, verification codes)
- Suspicious URLs or domains (typos, unusual TLDs, URL shorteners)
- Impersonation of legitimate companies with slight variations
- Poor grammar/spelling from supposed official sources
- Unexpected attachments or download requests
- Prize/lottery claims without participation
- Romance scams or emotional manipulation tactics
- Investment scams or unrealistic profit promises
- Tech support scams claiming computer infections
- Advance fee fraud (Nigerian prince style)
- Cryptocurrency or payment app scams
- Fake delivery notifications
- Phishing for login credentials

⚠️ SUSPICIOUS INDICATORS:
- Generic greetings ("Dear Customer", "Dear Sir/Madam")
- Mismatched sender domains
- Pressure tactics or artificial urgency
- Requests to click links or download files
- Unusual payment methods requested
- Grammar inconsistent with claimed origin
- Emotional appeals or sob stories
- Offers that seem too good to be true

✅ LEGITIMATE INDICATORS:
- Proper company branding and formatting
- Consistent grammar and professional language
- Appropriate sender domain matching company
- No requests for sensitive information
- Clear and reasonable purpose
- Professional contact information provided

RESPONSE FORMAT:
Return a JSON object with:
{
  "verdict": "SCAM|NOT A SCAM|SUSPICIOUS",
  "confidence": "High|Medium|Low", 
  "score": number (0-100),
  "explanation": "detailed reasoning",
  "redFlags": ["list", "of", "specific", "issues"],
  "category": "type of scam if applicable"
}

Be extremely thorough and err on the side of caution. If something seems even slightly suspicious, flag it.`

export async function POST(request: NextRequest) {
  try {
    const { type, content } = await request.json()

    // Initialize Google Generative AI with the API key
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    })

    let analysisContent = ""

    switch (type) {
      case "email":
        analysisContent = `
EMAIL ANALYSIS:
Subject: ${content.subject || "No subject"}
From: ${content.sender || "Unknown sender"}
Body: ${content.body || "No content"}
        `.trim()
        break

      case "message":
        analysisContent = `
MESSAGE ANALYSIS:
Content: ${content.text || "No content"}
        `.trim()
        break

      case "link":
        analysisContent = `
LINK ANALYSIS:
URL: ${content.url || "No URL"}
Context: ${content.context || "No context provided"}
        `.trim()
        break

      default:
        return NextResponse.json({ error: "Invalid analysis type" }, { status: 400 })
    }

    const prompt = `${SYSTEM_PROMPT}

Analyze this content for scams, phishing, and malicious intent:

${analysisContent}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse the AI response
    let analysisResult
    try {
      analysisResult = JSON.parse(text)
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      // Fallback parsing if JSON is malformed
      analysisResult = {
        verdict: extractValue(text, "verdict") || "SUSPICIOUS",
        confidence: extractValue(text, "confidence") || "Medium",
        score: Number.parseInt(extractValue(text, "score") || "50"),
        explanation: extractValue(text, "explanation") || text.substring(0, 500),
        redFlags: extractArray(text, "redFlags") || ["Unable to parse detailed analysis"],
        category: extractValue(text, "category") || undefined,
      }
    }

    // Ensure score is within valid range
    analysisResult.score = Math.max(0, Math.min(100, analysisResult.score || 50))

    // Validate verdict
    if (!["SCAM", "NOT A SCAM", "SUSPICIOUS"].includes(analysisResult.verdict)) {
      analysisResult.verdict = "SUSPICIOUS"
    }

    // Validate confidence
    if (!["High", "Medium", "Low"].includes(analysisResult.confidence)) {
      analysisResult.confidence = "Medium"
    }

    // Ensure redFlags is an array
    if (!Array.isArray(analysisResult.redFlags)) {
      analysisResult.redFlags = []
    }

    return NextResponse.json(analysisResult)
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json(
      {
        error: "Analysis failed",
        verdict: "SUSPICIOUS",
        confidence: "Low",
        score: 50,
        explanation: "Unable to complete analysis due to technical error. Please check your API configuration.",
        redFlags: ["Analysis error - API configuration issue"],
      },
      { status: 500 },
    )
  }
}

function extractValue(text: string, key: string): string | null {
  const patterns = [
    new RegExp(`"${key}":\\s*"([^"]*)"`, "i"),
    new RegExp(`${key}:\\s*"([^"]*)"`, "i"),
    new RegExp(`${key}:\\s*([^,\\n}]+)`, "i"),
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1].trim().replace(/"/g, "")
    }
  }
  return null
}

function extractArray(text: string, key: string): string[] | null {
  const patterns = [new RegExp(`"${key}":\\s*\\[([^\\]]+)\\]`, "i"), new RegExp(`${key}:\\s*\\[([^\\]]+)\\]`, "i")]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1]
        .split(",")
        .map((item) => item.trim().replace(/"/g, ""))
        .filter((item) => item.length > 0)
    }
  }
  return null
}
