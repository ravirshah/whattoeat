import CryptoJS from 'crypto-js';
import sanitizeHtml from 'sanitize-html';
import validator from 'validator';

// Security configuration
const SECURITY_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB (reduced from 10MB)
  ALLOWED_FILE_TYPES: {
    'application/pdf': { ext: '.pdf', maxSize: 5 * 1024 * 1024 },
    'text/plain': { ext: '.txt', maxSize: 1 * 1024 * 1024 },
    'application/msword': { ext: '.doc', maxSize: 5 * 1024 * 1024 },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: '.docx', maxSize: 5 * 1024 * 1024 }
    // Removed image uploads for security - health documents should be text-based
  },
  ENCRYPTION_KEY: process.env.NEXT_PUBLIC_HEALTH_DATA_KEY || 'default-key-change-in-production',
  RATE_LIMITS: {
    FILE_UPLOADS_PER_HOUR: 10,
    AI_REQUESTS_PER_HOUR: 20
  }
};

// File security validation
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedFileName?: string;
  fileHash?: string;
}

export const validateHealthDocumentFile = async (file: File): Promise<FileValidationResult> => {
  try {
    // 1. File size validation
    if (file.size > SECURITY_CONFIG.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: 'File size exceeds 5MB limit for security reasons'
      };
    }

    if (file.size === 0) {
      return {
        isValid: false,
        error: 'File is empty'
      };
    }

    // 2. File type validation by MIME type
    const allowedType = SECURITY_CONFIG.ALLOWED_FILE_TYPES[file.type as keyof typeof SECURITY_CONFIG.ALLOWED_FILE_TYPES];
    if (!allowedType) {
      return {
        isValid: false,
        error: 'File type not allowed. Only PDF, Word documents, and text files are permitted'
      };
    }

    // 3. File size validation per type
    if (file.size > allowedType.maxSize) {
      return {
        isValid: false,
        error: `File size exceeds ${Math.round(allowedType.maxSize / 1024 / 1024)}MB limit for ${file.type}`
      };
    }

    // 4. Filename validation and sanitization
    const sanitizedFileName = sanitizeFileName(file.name);
    if (!sanitizedFileName) {
      return {
        isValid: false,
        error: 'Invalid filename'
      };
    }

    // 5. File extension validation
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== allowedType.ext) {
      return {
        isValid: false,
        error: 'File extension does not match declared type'
      };
    }

    // 6. Generate file hash for integrity checking
    const fileBuffer = await file.arrayBuffer();
    const fileHash = CryptoJS.SHA256(CryptoJS.lib.WordArray.create(fileBuffer)).toString();

    // 7. Basic malware signature detection (simple patterns)
    const suspiciousPatterns = [
      /javascript:/gi,
      /<script/gi,
      /eval\(/gi,
      /exec\(/gi,
      /system\(/gi,
      /\$_GET|\$_POST/gi,
      /%3Cscript/gi
    ];

    // Read first 1KB for pattern detection
    const firstChunk = fileBuffer.slice(0, 1024);
    const firstChunkStr = new TextDecoder().decode(firstChunk);
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(firstChunkStr)) {
        return {
          isValid: false,
          error: 'File contains potentially malicious content'
        };
      }
    }

    return {
      isValid: true,
      sanitizedFileName,
      fileHash
    };

  } catch (error) {
    console.error('File validation error:', error);
    return {
      isValid: false,
      error: 'File validation failed'
    };
  }
};

// Filename sanitization
export const sanitizeFileName = (filename: string): string => {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');
  
  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');
  
  // Limit length
  if (sanitized.length > 100) {
    const extension = sanitized.split('.').pop();
    sanitized = sanitized.substring(0, 95) + '.' + extension;
  }
  
  // Ensure it's not empty
  if (!sanitized || sanitized.trim().length === 0) {
    return '';
  }
  
  return sanitized.trim();
};

// Health data encryption
export const encryptSensitiveHealthData = (data: any): string => {
  try {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, SECURITY_CONFIG.ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt health data');
  }
};

export const decryptSensitiveHealthData = (encryptedData: string): any => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, SECURITY_CONFIG.ENCRYPTION_KEY);
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt health data');
  }
};

// Input sanitization for AI prompts
export const sanitizeAIInput = (input: string): string => {
  // Remove HTML tags
  let sanitized = sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {}
  });

  // Remove potential prompt injection patterns
  const dangerousPatterns = [
    /ignore\s+previous\s+instructions?/gi,
    /forget\s+everything/gi,
    /you\s+are\s+now/gi,
    /system\s*:/gi,
    /override\s+safety/gi,
    /jailbreak/gi,
    /pretend\s+to\s+be/gi,
    /role\s*:\s*system/gi
  ];

  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  }

  // Limit input length
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000) + '... [truncated for security]';
  }

  return sanitized;
};

// Error message sanitization
export const sanitizeErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    // Remove sensitive paths, API keys, etc.
    let sanitized = error
      .replace(/\/Users\/[^\/]+/g, '[USER_PATH]')
      .replace(/\/home\/[^\/]+/g, '[USER_PATH]')
      .replace(/api[_-]?key[s]?[:\s]*[a-zA-Z0-9_-]+/gi, 'API_KEY: [REDACTED]')
      .replace(/token[s]?[:\s]*[a-zA-Z0-9_.-]+/gi, 'TOKEN: [REDACTED]')
      .replace(/password[s]?[:\s]*[^\s]+/gi, 'PASSWORD: [REDACTED]')
      .replace(/secret[s]?[:\s]*[a-zA-Z0-9_.-]+/gi, 'SECRET: [REDACTED]');
    
    return sanitized;
  }
  
  if (error instanceof Error) {
    return sanitizeErrorMessage(error.message);
  }
  
  return 'An error occurred during processing';
};

// Rate limiting helper
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export const checkRateLimit = (userId: string, action: 'file_upload' | 'ai_request'): boolean => {
  const now = Date.now();
  const key = `${userId}:${action}`;
  const limit = action === 'file_upload' 
    ? SECURITY_CONFIG.RATE_LIMITS.FILE_UPLOADS_PER_HOUR 
    : SECURITY_CONFIG.RATE_LIMITS.AI_REQUESTS_PER_HOUR;
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // First request or expired window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + (60 * 60 * 1000) // 1 hour
    });
    return true;
  }
  
  if (entry.count >= limit) {
    return false;
  }
  
  entry.count++;
  return true;
};

// Secure file reading with validation
export const secureFileRead = async (file: File): Promise<{
  content: string;
  metadata: {
    originalName: string;
    sanitizedName: string;
    size: number;
    type: string;
    hash: string;
  }
}> => {
  const validation = await validateHealthDocumentFile(file);
  
  if (!validation.isValid) {
    throw new Error(validation.error || 'File validation failed');
  }

  // For PDFs, return base64 with security markers
  if (file.type === 'application/pdf') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve({
            content: `[SECURE_PDF_BASE64]${result}`,
            metadata: {
              originalName: file.name,
              sanitizedName: validation.sanitizedFileName!,
              size: file.size,
              type: file.type,
              hash: validation.fileHash!
            }
          });
        } else {
          reject(new Error('Failed to read PDF file'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('File reading failed'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  // For text files, read as text with encoding validation
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        // Validate text encoding (remove non-printable characters)
        const hasValidContent = /^[\x20-\x7E\s\n\r\t]*$/.test(result) || validator.isAscii(result);
        if (!hasValidContent && result.length > 0) {
          // Allow UTF-8 content but warn about potential encoding issues
          console.warn('File may contain non-standard characters');
        }
        
        resolve({
          content: result,
          metadata: {
            originalName: file.name,
            sanitizedName: validation.sanitizedFileName!,
            size: file.size,
            type: file.type,
            hash: validation.fileHash!
          }
        });
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('File reading failed'));
    };
    
    reader.readAsText(file, 'UTF-8');
  });
}; 