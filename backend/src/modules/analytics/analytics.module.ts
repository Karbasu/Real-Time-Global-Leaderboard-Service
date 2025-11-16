import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../event-store/entities/event.entity';
import { EntityInstance } from '../entity/entities/entity-instance.entity';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsController } from './controllers/analytics.controller';
import { EventStoreModule } from '../event-store/event-store.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EntityInstance]),
    EventStoreModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
