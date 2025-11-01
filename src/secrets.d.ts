/**
 * Retrieves a secret from environment variables.
 * @param name - The name of the secret.
 * @returns The secret value as a string.
 * @throws If the secret is missing.
 */
export function getSecret(name: string): string;

/**
 * Retrieves an environment variable.
 * @param name - The name of the environment variable.
 * @returns The environment variable value as a string.
 * @throws If the environment variable is missing.
 */
export function getEnv(name: string): string;
