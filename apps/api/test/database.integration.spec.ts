import {randomUUID} from 'node:crypto';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {databaseUrlFromEnv, PrismaDatabaseConnection, type DatabaseConnection} from '@truck/database';
import {AppModule} from '../src/app.module';
import {DATABASE_CONNECTION} from '../src/database.module';

describe('PostgreSQL/PostGIS integration', () => {
  jest.setTimeout(30000);

  it('starts Nest with the real adapter, queries PostGIS and disconnects on close', async () => {
    const module = await Test.createTestingModule({imports: [AppModule]}).compile();
    const app = module.createNestApplication();
    const connection = app.get<DatabaseConnection>(DATABASE_CONNECTION);
    const close = jest.spyOn(connection, 'disconnect');
    try {
      await app.init();
      expect((await connection.probe()).postgisVersion).toMatch(/^3\.5\./);
      await request(app.getHttpServer()).get('/health').expect(200)
        .expect({status: 'ok', service: 'truck-route-savings-api'});
    } finally {await app.close();}
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('rejects a wrong password without exposing credentials', async () => {
    const url = new URL(databaseUrlFromEnv(process.env));
    const password = randomUUID();
    url.password = password;
    const connection = new PrismaDatabaseConnection(url.toString());
    try {
      await expect(connection.connect()).rejects.toEqual(new Error('PostgreSQL/PostGIS startup check failed'));
    } finally {await connection.disconnect();}
  });
});
