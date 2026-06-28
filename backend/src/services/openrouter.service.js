const axios = require("axios");
const fs = require("fs");
const path = require("path");

/**
 * OpenRouter Service
 * Handles communication with OpenRouter API for chatbot intelligence
 */

class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseUrl = "https://openrouter.ai/api/v1";
    this.model = process.env.OPENROUTER_MODEL || "meta-llama/llama-2-70b-chat";

    // Load FortiWeb reference documentation
    this.fortiwebReference = this.loadFortiWebReference();

    if (!this.apiKey) {
      console.warn("[OpenRouter] API key not configured in environment");
    }
  }

  /**
   * Load FortiWeb reference documentation from markdown file
   */
  loadFortiWebReference() {
    try {
      const refPath = path.join(__dirname, "../../reference/fortiweb7.6.4.md");
      if (fs.existsSync(refPath)) {
        const content = fs.readFileSync(refPath, "utf8");
        console.log(
          "[OpenRouter] ✅ Loaded FortiWeb 7.6.4 reference documentation",
        );

        return content;
      } else {
        console.warn(
          "[OpenRouter] ⚠️ FortiWeb reference file not found at:",
          refPath,
        );
        return null;
      }
    } catch (error) {
      console.error(
        "[OpenRouter] Error loading FortiWeb reference:",
        error.message,
      );
      return null;
    }
  }

  /**
   * Build system prompt with FortiWeb expertise context and reference documentation
   */
  buildSystemPrompt(fortiwebConfig = null) {
    let prompt = `You are an expert FortiWeb security administrator. Help users fix security issues by:
1. Analyzing security problems described by the user
2. Providing step-by-step fix recommendations
3. Generating accurate FortiWeb CLI commands
4. Explaining potential impacts and considerations

When providing fixes:
- Assess severity (LOW, MEDIUM, HIGH, CRITICAL)
- Explain the reasoning behind each suggestion
- List affected settings
- Provide exact CLI commands
- Mention potential impacts on the deployment
- Suggest backup or testing procedures

Below is the official FortiWeb 7.6.4 CLI reference for device-verified commands:

═══════════════════════════════════════════════════════════════
FORTIWEB 7.6.4 CLI REFERENCE
═══════════════════════════════════════════════════════════════`;

    if (this.fortiwebReference) {
      prompt += `\n${this.fortiwebReference}`;
    }

    prompt += `\n═══════════════════════════════════════════════════════════════`;

    if (fortiwebConfig) {
      prompt += `\n\nCurrent FortiWeb Configuration:\n${JSON.stringify(fortiwebConfig, null, 2)}`;
    }

    return prompt;
  }

  /**
   * Send message to OpenRouter and get AI response
   * @param {string} userMessage - User's question
   * @param {Array} conversationHistory - Previous messages for context
   * @param {Object} fortiwebConfig - Current FortiWeb configuration
   * @returns {Promise<Object>} - AI response with structured fix suggestion
   */
  async sendMessage(
    userMessage,
    conversationHistory = [],
    fortiwebConfig = null,
  ) {
    try {
      if (!this.apiKey) {
        throw new Error("OpenRouter API key not configured");
      }

      const messages = [
        {
          role: "system",
          content: this.buildSystemPrompt(fortiwebConfig),
        },
        ...conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: "user",
          content: userMessage,
        },
      ];

      console.log(
        `[OpenRouter] Sending message to ${this.model}`,
        `(${messages.length} messages in conversation)`,
      );

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: messages,
          temperature: 0.7, // Standard temperature for balanced responses
          max_tokens: 2000,
          top_p: 0.9,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "FortiWeb Automation Bot",
          },
          timeout: 30000,
        },
      );

      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error("No response from OpenRouter");
      }

      const assistantMessage = response.data.choices[0].message.content;

      console.log("[OpenRouter] ✅ Received response successfully");

      // Validate that response only uses reference-verified commands
      const validation = this.validateResponse(assistantMessage);
      if (validation.warnings.length > 0) {
        console.warn(
          "[OpenRouter] ⚠️ Response validation warnings:",
          validation.warnings,
        );
      }

      // Parse response to extract fix suggestion if present
      const fixSuggestion = this.parseFixSuggestion(assistantMessage);

      return {
        success: true,
        message: assistantMessage,
        fixSuggestion: fixSuggestion,
        validation: validation,
        usage: response.data.usage || {},
      };
    } catch (error) {
      console.error("[OpenRouter] Error:", error.message);
      if (error.response?.data) {
        console.error(
          "[OpenRouter] Response body:",
          JSON.stringify(error.response.data, null, 2),
        );
      }
      if (error.response?.status) {
        console.error("[OpenRouter] Status code:", error.response.status);
      }
      throw error;
    }
  }

  /**
   * Validate that LLM response only uses reference-verified commands
   * @param {string} responseText - LLM response
   * @returns {Object} - Validation result with warnings
   */
  validateResponse(responseText) {
    const warnings = [];
    const referenceText = this.fortiwebReference || "";

    // Check for suspicious command patterns
    const suspiciousPatterns = [
      /set\s+\w+\s+\w+(?!\n|$)/gi, // set commands
      /config\s+\w+/gi, // config blocks
      /edit\s+\w+/gi, // edit commands
    ];

    suspiciousPatterns.forEach((pattern) => {
      const matches = responseText.match(pattern) || [];
      matches.forEach((match) => {
        if (!referenceText.includes(match)) {
          warnings.push(
            `⚠️ Command "${match}" not found in reference documentation`,
          );
        }
      });
    });

    // Check for GUI-only features mentioned
    const guiOnlyFeatures = [
      "content-security-policy",
      "feature-policy",
      "referrer-policy",
    ];

    guiOnlyFeatures.forEach((feature) => {
      if (responseText.toLowerCase().includes(feature)) {
        if (responseText.match(new RegExp(`set.*${feature}`, "gi"))) {
          warnings.push(
            `⚠️ "${feature}" is GUI-only and should not be used in CLI commands`,
          );
        }
      }
    });

    return {
      isValid: warnings.length === 0,
      warnings: warnings,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Parse AI response to extract structured fix suggestion
   * @param {string} responseText - Raw AI response
   * @returns {Object|null} - Parsed fix suggestion or null
   */
  parseFixSuggestion(responseText) {
    try {
      // Look for JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.fortiwebCommands || parsed.commands) {
          return {
            description: parsed.description || "",
            affectedSettings: parsed.affectedSettings || [],
            fortiwebCommands: parsed.fortiwebCommands || parsed.commands || [],
            severity: parsed.severity || "MEDIUM",
            reasoning: parsed.reasoning || "",
            potentialImpacts: parsed.potentialImpacts || [],
          };
        }
      }
    } catch (e) {
      // Response doesn't contain structured JSON, return null
    }
    return null;
  }

  /**
   * Generate a fix suggestion based on security issue
   * @param {string} issue - Description of security issue
   * @param {Object} fortiwebConfig - Current FortiWeb config
   * @returns {Promise<Object>} - Fix suggestion with commands
   */
  async suggestFix(issue, fortiwebConfig = null) {
    const prompt = `Based on the security issue described below, provide a fix recommendation in JSON format using the FortiWeb reference provided above:

SECURITY ISSUE: ${issue}

Respond with ONLY a JSON object (no other text) with this structure:
{
  "description": "clear description of the fix",
  "affectedSettings": ["setting1", "setting2"],
  "fortiwebCommands": ["command1", "command2"],
  "severity": "HIGH|MEDIUM|LOW",
  "reasoning": "why this fix addresses the issue",
  "potentialImpacts": ["impact1", "impact2"]
}`;

    const response = await this.sendMessage(prompt, [], fortiwebConfig);
    return response;
  }

  /**
   * Chat with the bot for troubleshooting
   * @param {string} userQuestion - User's question
   * @param {Array} conversationHistory - Previous messages
   * @param {Object} fortiwebConfig - Current config
   * @returns {Promise<Object>} - Chat response
   */
  async chat(userQuestion, conversationHistory = [], fortiwebConfig = null) {
    return this.sendMessage(userQuestion, conversationHistory, fortiwebConfig);
  }
}

module.exports = new OpenRouterService();
