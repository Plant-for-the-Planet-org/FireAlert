import fs from 'fs';
import path from 'path';
import {validateMetadata, type VersionMetadata} from './schema';

/**
 * Path to the version metadata configuration file
 */
const METADATA_PATH = path.join(
  process.cwd(),
  'config',
  'version-metadata.json',
);

/**
 * In-memory cache for metadata
 */
let cachedMetadata: VersionMetadata | null = null;

/**
 * Last known good configuration (fallback)
 */
let lastKnownGoodMetadata: VersionMetadata | null = null;

/**
 * File watcher instance
 */
let watcher: fs.FSWatcher | null = null;

/**
 * Logger function (can be replaced with actual logger)
 */
const logger = {
  info: (message: string) => console.log(`[MetadataLoader] ${message}`),
  warn: (message: string) => console.warn(`[MetadataLoader] ${message}`),
  error: (message: string, error?: unknown) =>
    console.error(`[MetadataLoader] ${message}`, error),
};

/**
 * Load and parse version metadata from file
 * @returns Parsed and validated version metadata
 * @throws Error if file cannot be read or parsed
 */
function loadMetadataFromFile(): VersionMetadata {
  const fileContent = fs.readFileSync(METADATA_PATH, 'utf-8');
  const parsedData = JSON.parse(fileContent);
  return validateMetadata(parsedData);
}

/**
 * Initialize the metadata cache
 */
function initializeCache(): void {
  try {
    const metadata = loadMetadataFromFile();
    cachedMetadata = metadata;
    lastKnownGoodMetadata = metadata;
    logger.info('Metadata loaded successfully');
  } catch (error) {
    logger.error('Failed to load metadata on initialization', error);
    throw new Error(
      `Failed to load version metadata: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}

/**
 * Handle file change event
 */
function handleFileChange(): void {
  logger.info('Metadata file changed, reloading...');

  try {
    const metadata = loadMetadataFromFile();
    cachedMetadata = metadata;
    lastKnownGoodMetadata = metadata;
    logger.info('Metadata reloaded successfully');
  } catch (error) {
    logger.warn(
      `Failed to reload metadata, using last known good configuration: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
    // Keep using cachedMetadata (which is lastKnownGoodMetadata)
  }
}

/**
 * Start watching the metadata file for changes
 */
function startWatching(): void {
  if (watcher) {
    logger.warn('File watcher already started');
    return;
  }

  try {
    watcher = fs.watch(METADATA_PATH, eventType => {
      if (eventType === 'change') {
        handleFileChange();
      }
    });

    logger.info('File watcher started');
  } catch (error) {
    logger.error('Failed to start file watcher', error);
  }
}

/**
 * Stop watching the metadata file
 */
export function stopWatching(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
    logger.info('File watcher stopped');
  }
}

/**
 * Load version metadata with caching and hot reload support
 *
 * On first call, loads metadata from file and starts file watcher.
 * Subsequent calls return cached metadata.
 * When file changes, cache is invalidated and reloaded automatically.
 * On reload error, returns last known good configuration.
 *
 * @returns Version metadata
 */
export function loadVersionMetadata(): VersionMetadata {
  // Initialize cache on first call
  if (cachedMetadata === null) {
    initializeCache();
    startWatching();
  }

  // Return cached metadata (guaranteed to be non-null after initialization)
  return cachedMetadata!;
}

/**
 * Force reload metadata from file (useful for testing)
 * @returns Reloaded metadata
 */
export function reloadMetadata(): VersionMetadata {
  try {
    const metadata = loadMetadataFromFile();
    cachedMetadata = metadata;
    lastKnownGoodMetadata = metadata;
    logger.info('Metadata force reloaded successfully');
    return metadata;
  } catch (error) {
    logger.error('Failed to force reload metadata', error);
    throw error;
  }
}

/**
 * Clear cache (useful for testing)
 */
export function clearCache(): void {
  cachedMetadata = null;
  lastKnownGoodMetadata = null;
  stopWatching();
  logger.info('Cache cleared');
}
