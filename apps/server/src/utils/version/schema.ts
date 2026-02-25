import {z} from 'zod';

/**
 * CalVer format: YYYY-MM-DD
 */
const calverSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'CalVer must be in YYYY-MM-DD format',
});

/**
 * SemVer format: MAJOR.MINOR.PATCH
 */
const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/, {
  message: 'SemVer must be in MAJOR.MINOR.PATCH format',
});

/**
 * Platform enum
 */
const platformSchema = z.enum(['ios', 'android', 'web']);

/**
 * Compatibility rule schema
 */
const compatibilityRuleSchema = z.object({
  clientVersionPattern: z.string(),
  minApiVersion: calverSchema,
  maxApiVersion: calverSchema,
  platforms: z.array(platformSchema),
});

/**
 * Version mapping schema
 */
const versionMappingSchema = z.object({
  semver: semverSchema,
  releaseDate: z.string().datetime(),
  releaseNotes: z.string(),
});

/**
 * Version config schema (version-config.json)
 */
export const versionConfigSchema = z.object({
  calver: calverSchema,
  semver: semverSchema,
  buildNumbers: z.object({
    android: z.number().int().positive(),
    ios: z.number().int().positive(),
  }),
  versionMappings: z.record(calverSchema, versionMappingSchema),
});

/**
 * Version metadata schema (version-metadata.json)
 */
export const versionMetadataSchema = z.object({
  apiVersion: calverSchema,
  minimumVersions: z.object({
    ios: calverSchema,
    android: calverSchema,
    web: calverSchema,
  }),
  recommendedVersions: z.object({
    ios: calverSchema,
    android: calverSchema,
    web: calverSchema,
  }),
  compatibilityMatrix: z.array(compatibilityRuleSchema),
  forceUpdateMessages: z.object({
    ios: z.string(),
    android: z.string(),
    web: z.string(),
  }),
  softUpdateMessages: z.object({
    ios: z.string(),
    android: z.string(),
    web: z.string(),
  }),
  gracePeriod: z.object({
    enabled: z.boolean(),
    endDate: z.string().datetime(),
  }),
  bypassEndpoints: z.array(z.string()),
});

/**
 * Type exports
 */
export type VersionConfig = z.infer<typeof versionConfigSchema>;
export type VersionMetadata = z.infer<typeof versionMetadataSchema>;
export type CompatibilityRule = z.infer<typeof compatibilityRuleSchema>;
export type Platform = z.infer<typeof platformSchema>;

/**
 * Validate version config
 */
export function validateVersionConfig(data: unknown): VersionConfig {
  return versionConfigSchema.parse(data);
}

/**
 * Validate version metadata
 */
export function validateMetadata(data: unknown): VersionMetadata {
  return versionMetadataSchema.parse(data);
}
