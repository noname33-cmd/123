export interface DatabaseConnection {
  connect(): Promise<void>;
  probe(): Promise<{postgisVersion: string}>;
  disconnect(): Promise<void>;
}

export function databaseUrlFromEnv(env: Readonly<Record<string, string | undefined>>): string {
  const value = env.DATABASE_URL;
  if (!value) {throw new Error('DATABASE_URL is required');}
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname ||
        !url.username || !url.password || url.pathname.length < 2) {
      throw new Error('Invalid database URL');
    }
  } catch {
    // Never include credentials or the supplied URL in configuration errors.
    throw new Error('DATABASE_URL must be a PostgreSQL URL with host, database, username and password');
  }
  return value;
}
