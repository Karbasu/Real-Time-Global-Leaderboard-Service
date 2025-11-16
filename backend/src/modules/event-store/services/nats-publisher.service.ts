import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, NatsConnection, StringCodec } from 'nats';
import { Event } from '../entities/event.entity';

@Injectable()
export class NatsPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NatsPublisherService.name);
  private connection: NatsConnection | null = null;
  private readonly stringCodec = StringCodec();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      const natsUrl = this.configService.get('NATS_URL', 'nats://localhost:4222');
      this.connection = await connect({
        servers: natsUrl,
        name: this.configService.get('NATS_CLIENT_ID', 'temporal-state-engine'),
      });

      this.logger.log(`Connected to NATS at ${natsUrl}`);

      // Handle connection close
      (async () => {
        const err = await this.connection!.closed();
        if (err) {
          this.logger.error('NATS connection closed with error', err);
        } else {
          this.logger.log('NATS connection closed');
        }
      })();
    } catch (error) {
      this.logger.warn('Failed to connect to NATS, events will not be published', error);
    }
  }

  async onModuleDestroy() {
    if (this.connection) {
      await this.connection.drain();
      await this.connection.close();
    }
  }

  async publishEvent(event: Event): Promise<void> {
    if (!this.connection) {
      this.logger.warn('NATS not connected, skipping event publication');
      return;
    }

    const subject = `events.${event.entityTypeName}.${event.eventType}`;
    const payload = {
      id: event.id,
      entityInstanceId: event.entityInstanceId,
      entityTypeName: event.entityTypeName,
      eventType: event.eventType,
      version: event.version,
      payload: event.payload,
      previousState: event.previousState,
      newState: event.newState,
      metadata: event.metadata,
      timestamp: event.timestamp,
      correlationId: event.correlationId,
      causationId: event.causationId,
    };

    this.connection.publish(subject, this.stringCodec.encode(JSON.stringify(payload)));
    this.logger.debug(`Published event ${event.id} to ${subject}`);
  }

  async publishEntityCreated(
    entityTypeName: string,
    entityInstanceId: string,
    externalId: string,
    initialState: Record<string, unknown>,
  ): Promise<void> {
    if (!this.connection) {
      return;
    }

    const subject = `entities.${entityTypeName}.created`;
    const payload = {
      entityInstanceId,
      entityTypeName,
      externalId,
      initialState,
      timestamp: new Date().toISOString(),
    };

    this.connection.publish(subject, this.stringCodec.encode(JSON.stringify(payload)));
    this.logger.debug(`Published entity created event to ${subject}`);
  }

  async subscribe(
    subject: string,
    callback: (data: unknown) => Promise<void>,
  ): Promise<void> {
    if (!this.connection) {
      this.logger.warn('NATS not connected, cannot subscribe');
      return;
    }

    const subscription = this.connection.subscribe(subject);
    this.logger.log(`Subscribed to ${subject}`);

    (async () => {
      for await (const msg of subscription) {
        try {
          const data = JSON.parse(this.stringCodec.decode(msg.data));
          await callback(data);
        } catch (error) {
          this.logger.error(`Error processing message from ${subject}`, error);
        }
      }
    })();
  }
}
