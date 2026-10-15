import {Test} from '@nestjs/testing';
import {DATABASE_CONNECTION, DatabaseModule} from '../src/database.module';

describe('Database lifecycle', () => {
  it('rejects startup when the connection fails and still allows cleanup', async () => {
    const connection = {
      connect: jest.fn().mockRejectedValue(new Error('connection unavailable')),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };
    const module = await Test.createTestingModule({imports: [DatabaseModule]})
      .overrideProvider(DATABASE_CONNECTION).useValue(connection).compile();
    const app = module.createNestApplication();
    try {await expect(app.init()).rejects.toThrow('connection unavailable');}
    finally {await app.close();}
    expect(connection.disconnect).toHaveBeenCalledTimes(1);
  });

  it('closes its single connection on application shutdown', async () => {
    const connection = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };
    const module = await Test.createTestingModule({imports: [DatabaseModule]})
      .overrideProvider(DATABASE_CONNECTION).useValue(connection).compile();
    const app = module.createNestApplication();
    await app.init();
    await app.close();
    expect(connection.connect).toHaveBeenCalledTimes(1);
    expect(connection.disconnect).toHaveBeenCalledTimes(1);
  });
});
