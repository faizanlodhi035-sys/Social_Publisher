export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details?: unknown;

  constructor(message: string, statusCode = 500, errorCode = "INTERNAL_ERROR", details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ProviderNotConfiguredError extends AppError {
  constructor(platform: string) {
    super(`${platform} integration is not configured on the backend. Please add API credentials to backend/.env`, 400, "PROVIDER_NOT_CONFIGURED");
  }
}

export class OAuthStateError extends AppError {
  constructor(message = "Invalid or expired OAuth state token.") {
    super(message, 400, "OAUTH_STATE_INVALID");
  }
}

export class OAuthCallbackError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "OAUTH_CALLBACK_FAILED", details);
  }
}

export class AccountNotFoundError extends AppError {
  constructor(accountId: string) {
    super(`Account with ID '${accountId}' was not found.`, 404, "ACCOUNT_NOT_FOUND");
  }
}

export class PublishFailedError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "PUBLISH_FAILED", details);
  }
}
