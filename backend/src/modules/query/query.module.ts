import { Module } from '@nestjs/common';
import { QueryService } from './services/query.service';
import { QueryController } from './controllers/query.controller';
import { EventStoreModule } from '../event-store/event-store.module';
import { EntityModule } from '../entity/entity.module';

@Module({
  imports: [EventStoreModule, EntityModule],
  controllers: [QueryController],
  providers: [QueryService],
  exports: [QueryService],
})
export class QueryModule {}
