import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient} from './generated/prisma/client';
import {type DatabaseConnection, databaseUrlFromEnv} from './connection';

export class PrismaDatabaseConnection implements DatabaseConnection {
  private readonly client: PrismaClient;

  constructor(connectionString: string) {
    const adapter = new PrismaPg({
      connectionString: databaseUrlFromEnv({DATABASE_URL: connectionString}),
      application_name: 'truck-route-savings-api',
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
      statement_timeout: 5000,
    });
    this.client = new PrismaClient({adapter, log: []});
  }

  async connect(): Promise<void> {
    try {
      await this.client.$connect();
      await this.probe();
    } catch {
      try {await this.client.$disconnect();}
      catch { /* Preserve the sanitized startup error if cleanup also fails. */ }
      throw new Error('PostgreSQL/PostGIS startup check failed');
    }
  }

  async probe(): Promise<{postgisVersion: string}> {
    const rows = await this.client.$queryRaw<{postgisVersion: string}[]>`
      SELECT PostGIS_Lib_Version() AS "postgisVersion"
    `;
    const postgisVersion = rows[0]?.postgisVersion;
    if (!postgisVersion || !/^\d+\.\d+/.test(postgisVersion)) {
      throw new Error('PostGIS version check failed');
    }
    return {postgisVersion};
  }

  async disconnect(): Promise<void> {
    await this.client.$disconnect();
  }
}
