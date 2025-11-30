/**
 * Content Filtering for Menu Text
 * Filters inappropriate content, profanity, and personal information
 */

export interface FilterResult {
  isClean: boolean;
  sanitizedText: string;
  issues: {
    profanity: string[];
    pii: string[];
    suspicious: string[];
  };
  severity: 'none' | 'warning' | 'error';
}

// Basic profanity list (simplified - expand as needed)
const PROFANITY_PATTERNS = [
  /\b(fuck|shit|damn|hell|ass|bitch|bastard|crap)\b/gi,
  /\b(wtf|stfu|fck|sht)\b/gi
];

// Hate speech patterns (basic detection)
const HATE_SPEECH_PATTERNS = [
  /\b(nazi|kkk|racist|bigot|supremac)\b/gi
];

// Personal Information (PII) patterns
const PII_PATTERNS = {
  ssn: {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    name: 'Social Security Number'
  },
  creditCard: {
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    name: 'Credit Card Number'
  },
  email: {
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    name: 'Email Address'
  },
  phone: {
    pattern: /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/g,
    name: 'Phone Number'
  },
  url: {
    pattern: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi,
    name: 'URL'
  }
};

// Suspicious patterns that might indicate spam or abuse
const SUSPICIOUS_PATTERNS = {
  excessiveCaps: {
    pattern: /\b[A-Z]{10,}\b/g,  // 10+ consecutive caps
    name: 'Excessive capitalization'
  },
  repeatedChars: {
    pattern: /(.)\1{5,}/g,  // Same character repeated 6+ times
    name: 'Repeated characters'
  },
  excessiveEmojis: {
    pattern: /([\u{1F300}-\u{1F9FF}]){5,}/gu,  // 5+ consecutive emojis
    name: 'Excessive emojis'
  }
};

/**
 * Filter and sanitize menu text content
 */
export function sanitizeMenuText(text: string): FilterResult {
  const result: FilterResult = {
    isClean: true,
    sanitizedText: text,
    issues: {
      profanity: [],
      pii: [],
      suspicious: []
    },
    severity: 'none'
  };

  if (!text || text.trim().length === 0) {
    return result;
  }

  let workingText = text;

  // 1. Check for profanity (HARD BLOCK)
  for (const pattern of PROFANITY_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      result.isClean = false;
      result.severity = 'error';
      result.issues.profanity.push(...matches);
    }
  }

  // 2. Check for hate speech (HARD BLOCK)
  for (const pattern of HATE_SPEECH_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      result.isClean = false;
      result.severity = 'error';
      result.issues.profanity.push(...matches.map(m => `hate speech: ${m}`));
    }
  }

  // If profanity found, don't proceed with sanitization
  if (!result.isClean) {
    return result;
  }

  // 3. Detect and remove PII (WARNING - but sanitize and allow)
  for (const [key, config] of Object.entries(PII_PATTERNS)) {
    const matches = workingText.match(config.pattern);
    if (matches) {
      result.issues.pii.push(`${config.name} detected`);
      result.severity = result.severity === 'none' ? 'warning' : result.severity;

      // Sanitize by replacing with placeholder
      workingText = workingText.replace(config.pattern, `[${config.name}]`);
    }
  }

  // 4. Check for suspicious patterns (WARNING)
  for (const [key, config] of Object.entries(SUSPICIOUS_PATTERNS)) {
    const matches = text.match(config.pattern);
    if (matches && matches.length > 0) {
      result.issues.suspicious.push(config.name);
      if (result.severity === 'none') {
        result.severity = 'warning';
      }
    }
  }

  result.sanitizedText = workingText;

  return result;
}

/**
 * Filter an array of menu items
 */
export function filterMenuItems(menuItems: Array<{
  name?: string;
  description?: string;
  price?: string;
  category?: string;
}>): {
  filtered: typeof menuItems;
  results: FilterResult[];
  hasErrors: boolean;
  hasWarnings: boolean;
} {
  const results: FilterResult[] = [];
  const filtered = menuItems.map(item => {
    // Filter each text field
    const nameResult = sanitizeMenuText(item.name || '');
    const descResult = sanitizeMenuText(item.description || '');
    const catResult = sanitizeMenuText(item.category || '');

    // Combine results
    const combined: FilterResult = {
      isClean: nameResult.isClean && descResult.isClean && catResult.isClean,
      sanitizedText: '',
      issues: {
        profanity: [
          ...nameResult.issues.profanity,
          ...descResult.issues.profanity,
          ...catResult.issues.profanity
        ],
        pii: [
          ...nameResult.issues.pii,
          ...descResult.issues.pii,
          ...catResult.issues.pii
        ],
        suspicious: [
          ...nameResult.issues.suspicious,
          ...descResult.issues.suspicious,
          ...catResult.issues.suspicious
        ]
      },
      severity: [nameResult.severity, descResult.severity, catResult.severity]
        .includes('error') ? 'error' :
        [nameResult.severity, descResult.severity, catResult.severity]
          .includes('warning') ? 'warning' : 'none'
    };

    results.push(combined);

    return {
      ...item,
      name: nameResult.sanitizedText,
      description: descResult.sanitizedText,
      category: catResult.sanitizedText
    };
  });

  const hasErrors = results.some(r => r.severity === 'error');
  const hasWarnings = results.some(r => r.severity === 'warning');

  return {
    filtered,
    results,
    hasErrors,
    hasWarnings
  };
}

/**
 * Quick check if text contains profanity
 */
export function containsProfanity(text: string): boolean {
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  for (const pattern of HATE_SPEECH_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Quick check if text contains PII
 */
export function containsPII(text: string): boolean {
  for (const config of Object.values(PII_PATTERNS)) {
    if (config.pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Get detailed filter report
 */
export function getFilterReport(menuItems: any[]): {
  totalItems: number;
  cleanItems: number;
  itemsWithWarnings: number;
  itemsWithErrors: number;
  summary: string;
} {
  const { results } = filterMenuItems(menuItems);

  const cleanItems = results.filter(r => r.severity === 'none').length;
  const itemsWithWarnings = results.filter(r => r.severity === 'warning').length;
  const itemsWithErrors = results.filter(r => r.severity === 'error').length;

  let summary = '';
  if (itemsWithErrors > 0) {
    summary = `${itemsWithErrors} item(s) contain inappropriate content`;
  } else if (itemsWithWarnings > 0) {
    summary = `${itemsWithWarnings} item(s) contain personal information that was removed`;
  } else {
    summary = 'All content passed validation';
  }

  return {
    totalItems: menuItems.length,
    cleanItems,
    itemsWithWarnings,
    itemsWithErrors,
    summary
  };
}
