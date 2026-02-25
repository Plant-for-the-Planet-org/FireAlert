#!/usr/bin/env node
/**
 * Version Injection Utility
 *
 * This script reads version-config.json and injects version information into:
 * - Android build.gradle (versionCode, versionName)
 * - iOS project settings (MARKETING_VERSION, CURRENT_PROJECT_VERSION)
 * - React Native constants (apps/nativeapp/app/constants/version.ts)
 * - Next.js constants (apps/server/src/config/version.ts)
 * - Build history log (build-history.log)
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

interface VersionConfig {
  calver: string;
  semver: string;
  buildNumbers: {
    android: number;
    ios: number;
  };
  versionMappings: {
    [calver: string]: {
      semver: string;
      releaseDate: string;
      releaseNotes: string;
    };
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MONOREPO_ROOT = path.resolve(__dirname, "..");
const VERSION_CONFIG_PATH = path.join(MONOREPO_ROOT, "version-config.json");
const BUILD_HISTORY_PATH = path.join(MONOREPO_ROOT, "build-history.log");
const ANDROID_BUILD_GRADLE_PATH = path.join(
  MONOREPO_ROOT,
  "apps/nativeapp/android/app/build.gradle"
);
const IOS_PROJECT_PATH = path.join(
  MONOREPO_ROOT,
  "apps/nativeapp/ios/FireAlert.xcodeproj/project.pbxproj"
);
const RN_VERSION_CONSTANTS_PATH = path.join(
  MONOREPO_ROOT,
  "apps/nativeapp/app/constants/version.ts"
);
const NEXTJS_VERSION_CONSTANTS_PATH = path.join(
  MONOREPO_ROOT,
  "apps/server/src/config/version.ts"
);

/**
 * Read and validate version configuration
 */
function readVersionConfig(): VersionConfig {
  if (!fs.existsSync(VERSION_CONFIG_PATH)) {
    throw new Error(`Version config not found at ${VERSION_CONFIG_PATH}`);
  }

  const configContent = fs.readFileSync(VERSION_CONFIG_PATH, "utf-8");
  const config: VersionConfig = JSON.parse(configContent);

  // Validate CalVer format (YYYY-MM-DD)
  const calverRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!calverRegex.test(config.calver)) {
    throw new Error(
      `Invalid CalVer format: ${config.calver}. Expected YYYY-MM-DD`
    );
  }

  // Validate SemVer format (MAJOR.MINOR.PATCH)
  const semverRegex = /^\d+\.\d+\.\d+$/;
  if (!semverRegex.test(config.semver)) {
    throw new Error(
      `Invalid SemVer format: ${config.semver}. Expected MAJOR.MINOR.PATCH`
    );
  }

  // Validate build numbers
  if (
    !Number.isInteger(config.buildNumbers.android) ||
    config.buildNumbers.android < 1
  ) {
    throw new Error(
      `Invalid Android build number: ${config.buildNumbers.android}`
    );
  }
  if (
    !Number.isInteger(config.buildNumbers.ios) ||
    config.buildNumbers.ios < 1
  ) {
    throw new Error(`Invalid iOS build number: ${config.buildNumbers.ios}`);
  }

  return config;
}

/**
 * Validate that release notes exist for the current version
 */
function validateReleaseNotes(config: VersionConfig): void {
  const skipCheck = process.env.SKIP_RELEASE_NOTES_CHECK === "true";

  if (skipCheck) {
    console.log(
      "⚠️  Skipping release notes validation (SKIP_RELEASE_NOTES_CHECK=true)"
    );
    return;
  }

  if (!config.versionMappings[config.calver]) {
    throw new Error(
      `Release notes required for version ${config.calver}. ` +
        `Add an entry to versionMappings in version-config.json or set SKIP_RELEASE_NOTES_CHECK=true for development builds.`
    );
  }

  const mapping = config.versionMappings[config.calver];
  if (!mapping.releaseNotes || mapping.releaseNotes.trim() === "") {
    throw new Error(
      `Release notes are empty for version ${config.calver}. ` +
        `Please add release notes to version-config.json.`
    );
  }

  console.log("✓ Release notes validated");
}

/**
 * Update Android build.gradle with version information
 */
function updateAndroidBuildGradle(config: VersionConfig): void {
  if (!fs.existsSync(ANDROID_BUILD_GRADLE_PATH)) {
    throw new Error(
      `Android build.gradle not found at ${ANDROID_BUILD_GRADLE_PATH}`
    );
  }

  let gradleContent = fs.readFileSync(ANDROID_BUILD_GRADLE_PATH, "utf-8");

  // Update versionCode using regex
  const versionCodeRegex = /versionCode\s+\d+/;
  if (!versionCodeRegex.test(gradleContent)) {
    throw new Error("Could not find versionCode in build.gradle");
  }
  gradleContent = gradleContent.replace(
    versionCodeRegex,
    `versionCode ${config.buildNumbers.android}`
  );

  // Update versionName using regex
  const versionNameRegex = /versionName\s+"[^"]+"/;
  if (!versionNameRegex.test(gradleContent)) {
    throw new Error("Could not find versionName in build.gradle");
  }
  gradleContent = gradleContent.replace(
    versionNameRegex,
    `versionName "${config.semver}"`
  );

  fs.writeFileSync(ANDROID_BUILD_GRADLE_PATH, gradleContent, "utf-8");
  console.log(
    `✓ Updated Android build.gradle: versionCode=${config.buildNumbers.android}, versionName="${config.semver}"`
  );
}

/**
 * Update iOS project settings with version information
 */
function updateIOSProjectSettings(config: VersionConfig): void {
  if (!fs.existsSync(IOS_PROJECT_PATH)) {
    throw new Error(`iOS project.pbxproj not found at ${IOS_PROJECT_PATH}`);
  }

  let projectContent = fs.readFileSync(IOS_PROJECT_PATH, "utf-8");

  // Update MARKETING_VERSION
  const marketingVersionRegex = /MARKETING_VERSION = [^;]+;/g;
  if (!marketingVersionRegex.test(projectContent)) {
    throw new Error("Could not find MARKETING_VERSION in project.pbxproj");
  }
  projectContent = projectContent.replace(
    marketingVersionRegex,
    `MARKETING_VERSION = ${config.semver};`
  );

  // Update CURRENT_PROJECT_VERSION
  const currentProjectVersionRegex = /CURRENT_PROJECT_VERSION = [^;]+;/g;
  if (!currentProjectVersionRegex.test(projectContent)) {
    throw new Error(
      "Could not find CURRENT_PROJECT_VERSION in project.pbxproj"
    );
  }
  projectContent = projectContent.replace(
    currentProjectVersionRegex,
    `CURRENT_PROJECT_VERSION = ${config.buildNumbers.ios};`
  );

  fs.writeFileSync(IOS_PROJECT_PATH, projectContent, "utf-8");
  console.log(
    `✓ Updated iOS project settings: MARKETING_VERSION=${config.semver}, CURRENT_PROJECT_VERSION=${config.buildNumbers.ios}`
  );
}

/**
 * Generate React Native version constants
 */
function generateReactNativeConstants(config: VersionConfig): void {
  const constantsDir = path.dirname(RN_VERSION_CONSTANTS_PATH);
  if (!fs.existsSync(constantsDir)) {
    fs.mkdirSync(constantsDir, { recursive: true });
  }

  const content = `/**
 * Version Constants
 * 
 * This file is auto-generated by scripts/version-inject.ts
 * DO NOT EDIT MANUALLY
 */

import { Platform } from 'react-native';

export const VERSION_CONFIG = {
  CALVER: '${config.calver}',
  SEMVER: '${config.semver}',
  BUILD_NUMBER: Platform.OS === 'ios' ? ${config.buildNumbers.ios} : ${config.buildNumbers.android},
  PLATFORM: Platform.OS,
} as const;

export const getVersionString = (): string => {
  return \`\${VERSION_CONFIG.SEMVER} (\${VERSION_CONFIG.BUILD_NUMBER})\`;
};

export const getFullVersionInfo = () => ({
  calver: VERSION_CONFIG.CALVER,
  semver: VERSION_CONFIG.SEMVER,
  buildNumber: VERSION_CONFIG.BUILD_NUMBER,
  platform: VERSION_CONFIG.PLATFORM,
});
`;

  fs.writeFileSync(RN_VERSION_CONSTANTS_PATH, content, "utf-8");
  console.log(
    `✓ Generated React Native version constants at ${RN_VERSION_CONSTANTS_PATH}`
  );
}

/**
 * Generate Next.js version constants
 */
function generateNextJSConstants(config: VersionConfig): void {
  const constantsDir = path.dirname(NEXTJS_VERSION_CONSTANTS_PATH);
  if (!fs.existsSync(constantsDir)) {
    fs.mkdirSync(constantsDir, { recursive: true });
  }

  const content = `/**
 * Version Constants
 * 
 * This file is auto-generated by scripts/version-inject.ts
 * DO NOT EDIT MANUALLY
 */

export const VERSION_CONFIG = {
  CALVER: '${config.calver}',
  API_VERSION: '${config.calver}',
} as const;

export const getServerVersion = () => VERSION_CONFIG.CALVER;
`;

  fs.writeFileSync(NEXTJS_VERSION_CONSTANTS_PATH, content, "utf-8");
  console.log(
    `✓ Generated Next.js version constants at ${NEXTJS_VERSION_CONSTANTS_PATH}`
  );
}

/**
 * Append build entry to build history log
 */
function appendBuildHistory(config: VersionConfig): void {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} | CalVer: ${config.calver} | SemVer: ${config.semver} | Android: ${config.buildNumbers.android} | iOS: ${config.buildNumbers.ios}\n`;

  fs.appendFileSync(BUILD_HISTORY_PATH, logEntry, "utf-8");
  console.log(`✓ Appended build entry to ${BUILD_HISTORY_PATH}`);
}

/**
 * Main execution
 */
function main(): void {
  try {
    console.log("🚀 Starting version injection...\n");

    // Read and validate configuration
    const config = readVersionConfig();
    console.log(`📋 Version Configuration:`);
    console.log(`   CalVer: ${config.calver}`);
    console.log(`   SemVer: ${config.semver}`);
    console.log(`   Android Build: ${config.buildNumbers.android}`);
    console.log(`   iOS Build: ${config.buildNumbers.ios}\n`);

    // Validate release notes
    validateReleaseNotes(config);

    // Update platform-specific files
    updateAndroidBuildGradle(config);
    updateIOSProjectSettings(config);

    // Generate version constants
    generateReactNativeConstants(config);
    generateNextJSConstants(config);

    // Log build history
    appendBuildHistory(config);

    console.log("\n✅ Version injection completed successfully!");
  } catch (error) {
    console.error("\n❌ Version injection failed:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run if executed directly (ES module check)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  readVersionConfig,
  validateReleaseNotes,
  updateAndroidBuildGradle,
  updateIOSProjectSettings,
  generateReactNativeConstants,
  generateNextJSConstants,
  appendBuildHistory,
};
