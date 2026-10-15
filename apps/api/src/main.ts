import {createApp} from './bootstrap';

async function main() {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer from 1 to 65535');
  }
  const app = await createApp();
  await app.listen(port, '127.0.0.1');
}

void main().catch((error: unknown) => {console.error(error); process.exitCode = 1;});
