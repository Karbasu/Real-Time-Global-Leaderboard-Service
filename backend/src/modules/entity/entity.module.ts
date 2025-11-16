import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { EntityType } from './entities/entity-type.entity';
import { EntityInstance } from './entities/entity-instance.entity';
import { EntityService } from './services/entity.service';
import { EntityController } from './controllers/entity.controller';
import { CreateEntityTypeHandler } from './handlers/create-entity-type.handler';
import { CreateEntityInstanceHandler } from './handlers/create-entity-instance.handler';
import { ApplyEventHandler } from './handlers/apply-event.handler';
import { EventStoreModule } from '../event-store/event-store.module';
import { CacheModule } from '../cache/cache.module';

const CommandHandlers = [
  CreateEntityTypeHandler,
  CreateEntityInstanceHandler,
  ApplyEventHandler,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([EntityType, EntityInstance]),
    CqrsModule,
    forwardRef(() => EventStoreModule),
    CacheModule,
  ],
  controllers: [EntityController],
  providers: [EntityService, ...CommandHandlers],
  exports: [EntityService, TypeOrmModule],
})
export class EntityModule {}
