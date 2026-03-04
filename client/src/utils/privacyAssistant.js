/**
 * AI Privacy Assistant
 * Detects potentially sensitive information in messages before sending
 */

class PrivacyAssistant {
  constructor() {
    // Patterns for sensitive data detection
    this.patterns = {
      phone: [
        /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
        /\d{4}[-.\s]?\d{3}[-.\s]?\d{3}/g,
      ],
      email: [
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      ],
      cnic: [
        /\d{5}[-.\s]?\d{7}[-.\s]?\d{1}/g, // Pakistani CNIC format
        /\d{13}/g,
      ],
      password: [
        /password\s*[:=]\s*\S+/gi,
        /pwd\s*[:=]\s*\S+/gi,
        /pass\s*[:=]\s*\S+/gi,
      ],
      creditCard: [
        /\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}/g,
        /\d{13,19}/g,
      ],
      ssn: [
        /\d{3}-\d{2}-\d{4}/g,
        /\d{9}/g,
      ],
      ipAddress: [
        /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      ],
    };

    this.warnings = {
      phone: 'Phone number detected',
      email: 'Email address detected',
      cnic: 'CNIC/ID number detected',
      password: 'Password detected',
      creditCard: 'Credit card number detected',
      ssn: 'SSN detected',
      ipAddress: 'IP address detected',
    };
  }

  /**
   * Scan message for sensitive data
   * @param {string} message
   * @returns {Array<{type: string, warning: string, matches: Array<string>}>}
   */
  scanMessage(message) {
    const warnings = [];

    for (const [type, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        const matches = message.match(pattern);
        if (matches && matches.length > 0) {
          warnings.push({
            type,
            warning: this.warnings[type],
            matches: [...new Set(matches)], // Remove duplicates
          });
        }
      }
    }

    return warnings;
  }

  /**
   * Check if message contains sensitive data
   * @param {string} message
   * @returns {boolean}
   */
  hasSensitiveData(message) {
    return this.scanMessage(message).length > 0;
  }

  /**
   * Get formatted warning message
   * @param {string} message
   * @returns {string|null}
   */
  getWarningMessage(message) {
    const warnings = this.scanMessage(message);

    if (warnings.length === 0) {
      return null;
    }

    const warningTypes = warnings.map(w => w.warning).join(', ');
    return `⚠️ Privacy Warning: ${warningTypes} found in your message. Are you sure you want to send this?`;
  }

  /**
   * Get detailed warnings with matches
   * @param {string} message
   * @returns {Array<{type: string, warning: string, matches: Array<string>}>}
   */
  getDetailedWarnings(message) {
    return this.scanMessage(message);
  }
}


const privacyAssistantInstance = new PrivacyAssistant();
export default privacyAssistantInstance;

