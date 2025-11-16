import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis;
  private readonly DEFAULT_TTL = 3600; // 1 hour

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD', ''),
      db: this.configService.get('REDIS_DB', 0),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error', err);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis');
    });
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  private getEntityKey(entityTypeId: string, externalId: string): string {
    return `entity:${entityTypeId}:${externalId}`;
  }

  private getVersionKey(entityTypeId: string, externalId: string): string {
    return `version:${entityTypeId}:${externalId}`;
  }

  async setCurrentState(
    entityTypeId: string,
    externalId: string,
    state: Record<string, unknown>,
    version: number,
    ttl?: number,
  ): Promise<void> {
    const entityKey = this.getEntityKey(entityTypeId, externalId);
    const versionKey = this.getVersionKey(entityTypeId, externalId);
    const effectiveTtl = ttl || this.DEFAULT_TTL;

    const pipeline = this.redis.pipeline();
    pipeline.set(entityKey, JSON.stringify(state), 'EX', effectiveTtl);
    pipeline.set(versionKey, version.toString(), 'EX', effectiveTtl);
    await pipeline.exec();

    this.logger.debug(
      `Cached state for ${entityTypeId}:${externalId} at version ${version}`,
    );
  }

  async getCurrentState(
    entityTypeId: string,
    externalId: string,
  ): Promise<{ state: Record<string, unknown>; version: number } | null> {
    const entityKey = this.getEntityKey(entityTypeId, externalId);
    const versionKey = this.getVersionKey(entityTypeId, externalId);

    const [stateJson, versionStr] = await this.redis.mget(
      entityKey,
      versionKey,
    );

    if (!stateJson || !versionStr) {
      return null;
    }

    return {
      state: JSON.parse(stateJson),
      version: parseInt(versionStr, 10),
    };
  }

  async invalidateState(
    entityTypeId: string,
    externalId: string,
  ): Promise<void> {
    const entityKey = this.getEntityKey(entityTypeId, externalId);
    const versionKey = this.getVersionKey(entityTypeId, externalId);

    await this.redis.del(entityKey, versionKey);
    this.logger.debug(`Invalidated cache for ${entityTypeId}:${externalId}`);
  }

  async setWithExpiry(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async increment(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async getAllEntityKeys(pattern: string): Promise<string[]> {
    return this.redis.keys(pattern);
  }

  async getMultipleStates(
    keys: Array<{ entityTypeId: string; externalId: string }>,
  ): Promise<Map<string, { state: Record<string, unknown>; version: number }>> {
    if (keys.length === 0) {
      return new Map();
    }

    const redisKeys: string[] = [];
    for (const key of keys) {
      redisKeys.push(this.getEntityKey(key.entityTypeId, key.externalId));
      redisKeys.push(this.getVersionKey(key.entityTypeId, key.externalId));
    }

    const values = await this.redis.mget(...redisKeys);
    const result = new Map<
      string,
      { state: Record<string, unknown>; version: number }
    >();

    for (let i = 0; i < keys.length; i++) {
      const stateJson = values[i * 2];
      const versionStr = values[i * 2 + 1];

      if (stateJson && versionStr) {
        const mapKey = `${keys[i].entityTypeId}:${keys[i].externalId}`;
        result.set(mapKey, {
          state: JSON.parse(stateJson),
          version: parseInt(versionStr, 10),
        });
      }
    }

    return result;
  }
}
