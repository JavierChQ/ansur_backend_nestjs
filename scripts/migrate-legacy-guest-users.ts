import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { LegacyGuestMigrationService } from '../src/users/legacy-guest-migration.service';

async function bootstrap(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const sendActivationEmails = process.argv.includes('--send-emails');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const migration = app.get(LegacyGuestMigrationService);
    const result = await migration.run({
      dryRun,
      sendActivationEmails,
    });

    console.log(JSON.stringify(result, null, 2));

    if (dryRun) {
      console.log('Modo dry-run: no se aplicaron cambios.');
    }
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
