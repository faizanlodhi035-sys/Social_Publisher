import { AppError } from "../../utils/errors.js";

export class AIError extends AppError {
  constructor(message: string, statusCode = 500, errorCode = "AI_ERROR", details?: unknown) {
    super(message, statusCode, errorCode, details);
    Object.setPrototypeOf(this, AIError.prototype);
  }
}

export class AIValidationError extends AIError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "AI_VALIDATION_ERROR", details);
    Object.setPrototypeOf(this, AIValidationError.prototype);
  }
}

export class AITimeoutError extends AIError {
  constructor(message = "AI service request timed out. Please try again.") {
    super(message, 504, "AI_TIMEOUT");
    Object.setPrototypeOf(this, AITimeoutError.prototype);
  }
}

export class AIRateLimitError extends AIError {
  constructor(message = "AI request rate limit reached. Please wait a moment before trying again.") {
    super(message, 429, "AI_RATE_LIMIT");
    Object.setPrototypeOf(this, AIRateLimitError.prototype);
  }
}

export class AIProviderError extends AIError {
  constructor(message = "AI service is temporarily unavailable. Please try again shortly.", details?: unknown) {
    super(message, 502, "AI_PROVIDER_ERROR", details);
    Object.setPrototypeOf(this, AIProviderError.prototype);
  }
}

export class AIOutputParseError extends AIError {
  constructor(message = "Received an unparseable response from AI model. Please try regenerating.", details?: unknown) {
    super(message, 502, "AI_OUTPUT_PARSE_ERROR", details);
    Object.setPrototypeOf(this, AIOutputParseError.prototype);
  }
}

export class AISafetyBlockError extends AIError {
  constructor(message = "The requested prompt was blocked by content safety filters. Please adjust your topic and try again.") {
    super(message, 400, "AI_SAFETY_BLOCK");
    Object.setPrototypeOf(this, AISafetyBlockError.prototype);
  }
}
