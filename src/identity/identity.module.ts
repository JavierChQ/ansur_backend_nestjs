import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IdentityCacheService } from './identity-cache.service';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { ApisPeruIdentityProvider } from './providers/apisperu-identity.provider';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        timeout: Number(
          configService.get<string>('IDENTITY_API_TIMEOUT_MS') ?? 8000,
        ),
        maxRedirects: 3,
      }),
    }),
  ],
  controllers: [IdentityController],
  providers: [IdentityService, IdentityCacheService, ApisPeruIdentityProvider],
  exports: [IdentityService],
})
export class IdentityModule {}
