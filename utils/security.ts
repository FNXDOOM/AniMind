
/**
 * Validates email format
 * @param email - Email address to validate
 * @returns boolean - True if valid email format
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  
  // RFC 5322 simplified regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validates password strength
 * Requirements: 
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one number
 * @param password - Password to validate
 * @returns object with isValid and error message
 */
export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }

  return { isValid: true };
};

/**
 * Validates username format
 * Requirements:
 * - 3-20 characters
 * - Alphanumeric and underscores only
 * @param username - Username to validate
 * @returns object with isValid and error message
 */
export const validateUsername = (username: string): { isValid: boolean; error?: string } => {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();

  if (trimmed.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }

  if (trimmed.length > 20) {
    return { isValid: false, error: 'Username must be 20 characters or less' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  return { isValid: true };
};

/**
 * Sanitizes search query to prevent injection attacks
 * @param query - Search query string
 * @returns sanitized query string
 */
export const sanitizeSearchQuery = (query: string): string => {
  if (!query || typeof query !== 'string') return '';
  
  // Remove any potentially dangerous characters
  return query
    .trim()
    .replace(/[<>\"']/g, '') // Remove HTML/script injection characters
    .substring(0, 100); // Limit length
};

/**
 * Debounce function to limit API call frequency
 * @param func - Function to debounce
 * @param wait - Milliseconds to wait
 * @returns debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Rate limiter to prevent abuse
 */
export class RateLimiter {
  private attempts: number[] = [];
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  canAttempt(): boolean {
    const now = Date.now();
    // Remove old attempts outside the time window
    this.attempts = this.attempts.filter(time => now - time < this.windowMs);
    
    return this.attempts.length < this.maxAttempts;
  }

  recordAttempt(): void {
    this.attempts.push(Date.now());
  }

  getRemainingAttempts(): number {
    const now = Date.now();
    this.attempts = this.attempts.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxAttempts - this.attempts.length);
  }

  getTimeUntilReset(): number {
    if (this.attempts.length === 0) return 0;
    const oldestAttempt = Math.min(...this.attempts);
    const resetTime = oldestAttempt + this.windowMs;
    return Math.max(0, resetTime - Date.now());
  }
}
