// apps/functions/src/lib/utils/secrets.ts
import * as fs from 'fs';
import * as path from 'path';

/**
 * Check if we're running in the Firebase emulator
 */
function isEmulator(): boolean {
  return (
    process.env['FUNCTIONS_EMULATOR'] === 'true' ||
    process.env['FIREBASE_CONFIG'] === undefined ||
    process.env['GCLOUD_PROJECT']?.includes('demo-') ||
    process.env['GCLOUD_PROJECT'] === 'demo-test'
  );
}

/**
 * Load secrets from .secret.local file for emulator use
 */
function loadLocalSecrets(): void {
  if (!isEmulator()) {
    return; // Only load in emulator
  }

  // Try multiple possible paths for .secret.local
  // In compiled output, __dirname points to dist/apps/functions/lib/utils
  // So we need to go up to dist/apps/functions
  const cwd = process.cwd();
  const dirname = __dirname;
  
  // Normalize paths to avoid duplicates
  const possiblePaths = [
    // From compiled location (lib/utils -> dist/apps/functions)
    path.resolve(dirname, '../../.secret.local'),
    // If cwd is dist/apps/functions
    path.resolve(cwd, '.secret.local'),
    // If cwd is workspace root
    path.resolve(cwd, 'dist/apps/functions/.secret.local'),
    // If cwd is dist/apps/functions/lib/utils (shouldn't happen but just in case)
    path.resolve(cwd, '../../.secret.local'),
  ];
  
  // Remove duplicates and normalize
  const uniquePaths = Array.from(new Set(possiblePaths.map(p => path.normalize(p))));
  
  let secretFilePath: string | null = null;
  for (const possiblePath of uniquePaths) {
    if (fs.existsSync(possiblePath)) {
      secretFilePath = possiblePath;
      break;
    }
  }
  
  if (!secretFilePath) {
    console.warn(
      `[Secrets] .secret.local file not found. Tried: ${uniquePaths.join(', ')}. Using environment variables or Secret Manager.`
    );
    return;
  }
  
  try {
    const secretFileContent = fs.readFileSync(secretFilePath, 'utf-8');
    const lines = secretFileContent.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Only set if not already in environment (env vars take precedence)
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = value;
          }
        }
      }
    }
    console.log(`[Secrets] Loaded secrets from .secret.local file at ${secretFilePath}`);
  } catch (error) {
    console.error('[Secrets] Error loading .secret.local file:', error);
  }
}

/**
 * Get a secret value, checking multiple sources in order:
 * 1. Firebase Secret Manager (production)
 * 2. Environment variables (set by .secret.local in emulator)
 * 3. Fallback to undefined
 */
export function getSecret(
  secretValue: string | undefined,
  envKey: string
): string | undefined {
  // Load local secrets if in emulator (only once)
  if (isEmulator() && !process.env['__SECRETS_LOADED__']) {
    loadLocalSecrets();
    process.env['__SECRETS_LOADED__'] = 'true';
  }

  // Priority 1: Secret Manager value (production)
  if (secretValue) {
    return secretValue;
  }

  // Priority 2: Environment variable (emulator or manually set)
  return process.env[envKey];
}

/**
 * Check if we're in emulator mode
 */
export function isEmulatorMode(): boolean {
  return isEmulator();
}
