// Base error class
export {AppError} from './AppError';

// Site-specific errors
export {
  SiteNotFoundError,
  SitePermissionDeniedError,
  SiteAreaExceedsLimitError,
  PlanetROSiteRestrictionError,
  TestAlertLimitExceededError,
  InvalidGeometryError,
} from './SiteErrors';

// Validation errors
export {
  ValidationError,
  RequiredFieldError,
  InvalidInputError,
} from './ValidationErrors';

// Database errors
export {
  DatabaseConnectionError,
  DatabaseQueryError,
  DatabaseConstraintError,
  RecordNotFoundError,
} from './DatabaseErrors';

// GeoEvent Provider errors
export {
  ProviderNotFoundError,
  ProviderAlreadyRegisteredError,
  ProviderConfigurationError,
  ProviderDataFetchError,
  ProviderValidationError,
  ProviderApiError,
  ProviderDataParsingError,
} from './GeoEventProviderErrors';
