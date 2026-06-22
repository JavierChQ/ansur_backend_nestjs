import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SeedService } from '../src/seed/seed.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const seedService = app.get(SeedService);
    await seedService.run();
  } finally {
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(`[seed] Error: ${error.message ?? error}`);
    process.exit(1);
  });
