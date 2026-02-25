#!/usr/bin/env node

/**
 * Validation script for version configuration files
 *
 * This script validates:
 * - version-config.json at monorepo root
 * - version-metadata.json in apps/server/config/
 *
 * Usage: node scripts/validate-version-config.ts
 */

import * as fs from "fs";
import * as path from "path";
import {
  validateVersionConfig,
  validateMetadata,
} from "../apps/server/src/utils/version/schema";

const MONOREPO_ROOT = path.resolve(__dirname, "..");
const VERSION_CONFIG_PATH = path.join(MONOREPO_ROOT, "version-config.json");
const VERSION_METADATA_PATH = path.join(
  MONOREPO_ROOT,
  "apps/server/config/version-metadata.json"
);

function validateFile(
  filePath: string,
  validator: (data: unknown) => unknown,
  name: string
) {
  console.log(`\nValidating ${name}...`);
  console.log(`Path: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }

  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(fileContent);
    validator(data);
    console.log(`✅ ${name} is valid`);
    return true;
  } catch (error) {
    console.error(`❌ ${name} validation failed:`);
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    return false;
  }
}

function main() {
  console.log("=".repeat(60));
  console.log("Version Configuration Validation");
  console.log("=".repeat(60));

  const configValid = validateFile(
    VERSION_CONFIG_PATH,
    validateVersionConfig,
    "version-config.json"
  );

  const metadataValid = validateFile(
    VERSION_METADATA_PATH,
    validateMetadata,
    "version-metadata.json"
  );

  console.log("\n" + "=".repeat(60));
  if (configValid && metadataValid) {
    console.log("✅ All version configuration files are valid");
    console.log("=".repeat(60));
    process.exit(0);
  } else {
    console.log("❌ Some version configuration files are invalid");
    console.log("=".repeat(60));
    process.exit(1);
  }
}

main();
