import {INestApplication} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {AppModule} from '../src/app.module';
import {DATABASE_CONNECTION} from '../src/database.module';

describe('HTTP application', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({imports: [AppModule]})
      .overrideProvider(DATABASE_CONNECTION)
      .useValue({connect: jest.fn().mockResolvedValue(undefined), disconnect: jest.fn().mockResolvedValue(undefined)})
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {await app.close();});
  it('GET /health returns liveness', async () => {
    await request(app.getHttpServer()).get('/health').expect(200).expect({status: 'ok', service: 'truck-route-savings-api'});
  });
  it('does not expose a routing endpoint', async () => {
    await request(app.getHttpServer()).get('/routes').expect(404);
  });
});
