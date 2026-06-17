import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DniIdentityResult,
  RucIdentityResult,
} from './interfaces/identity-result.interface';

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

@Injectable()
export class IdentityCacheService {
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor(private readonly configService: ConfigService) {}

  getDni(docNumber: string): DniIdentityResult | null {
    return this.get<DniIdentityResult>(this.buildDniKey(docNumber));
  }

  setDni(docNumber: string, value: DniIdentityResult): void {
    this.set(this.buildDniKey(docNumber), value);
  }

  getRuc(docNumber: string): RucIdentityResult | null {
    return this.get<RucIdentityResult>(this.buildRucKey(docNumber));
  }

  setRuc(docNumber: string, value: RucIdentityResult): void {
    this.set(this.buildRucKey(docNumber), value);
  }

  clear(): void {
    this.cache.clear();
  }

  private buildDniKey(docNumber: string): string {
    return `dni:${docNumber}`;
  }

  private buildRucKey(docNumber: string): string {
    return `ruc:${docNumber}`;
  }

  private get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  private set(key: string, value: unknown): void {
    const ttlSeconds = Number(
      this.configService.get<string>('IDENTITY_CACHE_TTL_SECONDS') ?? 86_400,
    );

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
}
