import {Inject, Injectable, Module, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {databaseUrlFromEnv, PrismaDatabaseConnection, type DatabaseConnection} from '@truck/database';

export const DATABASE_CONNECTION = Symbol('DATABASE_CONNECTION');

@Injectable()
class DatabaseLifecycle implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(DATABASE_CONNECTION) private readonly connection: DatabaseConnection) {}
  async onModuleInit(): Promise<void> {await this.connection.connect();}
  async onModuleDestroy(): Promise<void> {await this.connection.disconnect();}
}

@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: (): DatabaseConnection => new PrismaDatabaseConnection(databaseUrlFromEnv(process.env)),
    },
    DatabaseLifecycle,
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
