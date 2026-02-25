/**
 * Changelog Parser
 *
 * Parses CHANGELOG.md to extract version information and generate
 * user-facing release notes.
 */

import {readFileSync} from 'fs';
import {join} from 'path';

/**
 * Changelog entry structure
 */
export interface ChangelogEntry {
  calver: string;
  semver: string;
  releaseDate: string;
  sections: {
    breakingChanges?: string[];
    added?: string[];
    changed?: string[];
    deprecated?: string[];
    removed?: string[];
    fixed?: string[];
    security?: string[];
    technical?: string[];
  };
  rawContent: string;
}

/**
 * Version mapping from changelog table
 */
export interface VersionMapping {
  calver: string;
  semver: string;
  releaseDate: string;
  platform: string;
}

/**
 * Parse the version mapping table from CHANGELOG.md
 *
 * @param changelogPath - Path to CHANGELOG.md
 * @returns Array of version mappings
 */
export function parseVersionMappings(changelogPath?: string): VersionMapping[] {
  const path = changelogPath || join(process.cwd(), '..', '..', 'CHANGELOG.md');
  const content = readFileSync(path, 'utf-8');

  const mappings: VersionMapping[] = [];

  // Find the version mapping table
  const tableRegex =
    /\| CalVer\s+\| SemVer\s+\| Release Date\s+\| Platform\s+\|[\s\S]*?\n((?:\|[^\n]+\n)+)/;
  const tableMatch = content.match(tableRegex);

  if (!tableMatch) {
    return mappings;
  }

  const tableRows = tableMatch[1].split('\n').filter(row => row.trim());

  for (const row of tableRows) {
    // Skip separator rows
    if (row.includes('---')) continue;

    const columns = row
      .split('|')
      .map(col => col.trim())
      .filter(col => col);

    if (columns.length >= 4) {
      mappings.push({
        calver: columns[0] || '',
        semver: columns[1] || '',
        releaseDate: columns[2] || '',
        platform: columns[3] || '',
      });
    }
  }

  return mappings;
}

/**
 * Parse a single changelog entry
 *
 * @param entryText - Raw text of the changelog entry
 * @returns Parsed changelog entry
 */
function parseChangelogEntry(entryText: string): ChangelogEntry | null {
  // Extract version header: ## [YYYY-MM-DD] - MAJOR.MINOR.PATCH - YYYY-MM-DD
  const headerRegex =
    /##\s+\[(\d{4}-\d{2}-\d{2})\]\s+-\s+([\d.]+)\s+-\s+(\d{4}-\d{2}-\d{2})/;
  const headerMatch = entryText.match(headerRegex);

  if (!headerMatch) {
    return null;
  }

  const calver = headerMatch[1] || '';
  const semver = headerMatch[2] || '';
  const releaseDate = headerMatch[3] || '';

  const sections: ChangelogEntry['sections'] = {};

  // Parse sections
  const sectionRegex =
    /###\s+(Breaking Changes|Added|Changed|Deprecated|Removed|Fixed|Security|Technical)\s*\n((?:(?!###)[\s\S])*)/g;
  let sectionMatch;

  while ((sectionMatch = sectionRegex.exec(entryText)) !== null) {
    const sectionName = sectionMatch[1]
      ?.toLowerCase()
      .replace(/\s+/g, '') as keyof ChangelogEntry['sections'];
    const sectionContent = sectionMatch[2]?.trim() || '';

    // Parse bullet points
    const items = sectionContent
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.trim().substring(1).trim());

    if (items.length > 0) {
      sections[sectionName] = items;
    }
  }

  return {
    calver,
    semver,
    releaseDate,
    sections,
    rawContent: entryText,
  };
}

/**
 * Parse all changelog entries from CHANGELOG.md
 *
 * @param changelogPath - Path to CHANGELOG.md
 * @returns Array of parsed changelog entries
 *
 * Requirements: 15.4
 */
export function parseChangelog(changelogPath?: string): ChangelogEntry[] {
  const path = changelogPath || join(process.cwd(), '..', '..', 'CHANGELOG.md');
  const content = readFileSync(path, 'utf-8');

  const entries: ChangelogEntry[] = [];

  // Split by version headers
  const versionRegex =
    /##\s+\[\d{4}-\d{2}-\d{2}\]\s+-\s+[\d.]+\s+-\s+\d{4}-\d{2}-\d{2}/g;
  const matches = [...content.matchAll(versionRegex)];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const nextMatch = matches[i + 1];

    if (!match || match.index === undefined) continue;

    const startIndex = match.index;
    const endIndex = nextMatch?.index ?? content.length;
    const entryText = content.substring(startIndex, endIndex);

    const entry = parseChangelogEntry(entryText);
    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

/**
 * Get changelog entry for a specific version
 *
 * @param version - CalVer or SemVer version string
 * @param changelogPath - Path to CHANGELOG.md
 * @returns Changelog entry or null if not found
 */
export function getChangelogEntry(
  version: string,
  changelogPath?: string,
): ChangelogEntry | null {
  const entries = parseChangelog(changelogPath);

  return (
    entries.find(
      entry => entry.calver === version || entry.semver === version,
    ) || null
  );
}

/**
 * Generate user-facing release notes from changelog entry
 *
 * Focuses on user-visible changes and excludes technical details.
 *
 * @param entry - Changelog entry
 * @param includeBreaking - Whether to include breaking changes
 * @returns Formatted release notes
 *
 * Requirements: 15.4
 */
export function generateReleaseNotes(
  entry: ChangelogEntry,
  includeBreaking = true,
): string {
  const lines: string[] = [];

  // Add breaking changes prominently
  if (includeBreaking && entry.sections.breakingChanges) {
    lines.push('⚠️ BREAKING CHANGES');
    lines.push('');
    for (const item of entry.sections.breakingChanges) {
      lines.push(`• ${item}`);
    }
    lines.push('');
  }

  // Add new features
  if (entry.sections.added) {
    lines.push('✨ New Features');
    lines.push('');
    for (const item of entry.sections.added) {
      lines.push(`• ${item}`);
    }
    lines.push('');
  }

  // Add improvements
  if (entry.sections.changed) {
    lines.push('🔧 Improvements');
    lines.push('');
    for (const item of entry.sections.changed) {
      lines.push(`• ${item}`);
    }
    lines.push('');
  }

  // Add bug fixes
  if (entry.sections.fixed) {
    lines.push('🐛 Bug Fixes');
    lines.push('');
    for (const item of entry.sections.fixed) {
      lines.push(`• ${item}`);
    }
    lines.push('');
  }

  // Add security fixes
  if (entry.sections.security) {
    lines.push('🔒 Security');
    lines.push('');
    for (const item of entry.sections.security) {
      lines.push(`• ${item}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

/**
 * Get release notes between two versions
 *
 * @param fromVersion - Starting version (CalVer or SemVer)
 * @param toVersion - Ending version (CalVer or SemVer)
 * @param changelogPath - Path to CHANGELOG.md
 * @returns Combined release notes for all versions in range
 *
 * Requirements: 15.4
 */
export function getReleaseNotesBetweenVersions(
  fromVersion: string,
  toVersion: string,
  changelogPath?: string,
): string {
  const entries = parseChangelog(changelogPath);

  // Find entries between versions
  const fromEntry = entries.find(
    e => e.calver === fromVersion || e.semver === fromVersion,
  );
  const toEntry = entries.find(
    e => e.calver === toVersion || e.semver === toVersion,
  );

  if (!fromEntry || !toEntry) {
    return '';
  }

  const fromIndex = entries.indexOf(fromEntry);
  const toIndex = entries.indexOf(toEntry);

  // Get all entries in range (excluding fromVersion, including toVersion)
  const rangeEntries =
    fromIndex < toIndex
      ? entries.slice(fromIndex + 1, toIndex + 1)
      : entries.slice(toIndex, fromIndex);

  // Generate combined release notes
  const sections: string[] = [];

  for (const entry of rangeEntries) {
    sections.push(`Version ${entry.semver} (${entry.calver})`);
    sections.push('─'.repeat(50));
    sections.push(generateReleaseNotes(entry));
    sections.push('');
  }

  return sections.join('\n').trim();
}

/**
 * Get the latest changelog entry
 *
 * @param changelogPath - Path to CHANGELOG.md
 * @returns Latest changelog entry or null if none found
 */
export function getLatestChangelogEntry(
  changelogPath?: string,
): ChangelogEntry | null {
  const entries = parseChangelog(changelogPath);
  return entries.length > 0 ? entries[0] || null : null;
}

/**
 * Check if a version exists in the changelog
 *
 * @param version - CalVer or SemVer version string
 * @param changelogPath - Path to CHANGELOG.md
 * @returns True if version exists, false otherwise
 */
export function versionExistsInChangelog(
  version: string,
  changelogPath?: string,
): boolean {
  return getChangelogEntry(version, changelogPath) !== null;
}
