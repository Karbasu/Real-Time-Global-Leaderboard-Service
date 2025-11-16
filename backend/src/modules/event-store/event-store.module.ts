import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { Snapshot } from './entities/snapshot.entity';
import { EventStoreService } from './services/event-store.service';
import { NatsPublisherService } from './services/nats-publisher.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Snapshot])],
  providers: [EventStoreService, NatsPublisherService],
  exports: [EventStoreService, NatsPublisherService, TypeOrmModule],
})
export class EventStoreModule {}
