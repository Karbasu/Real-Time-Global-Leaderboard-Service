import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateEntityInstanceCommand } from '../commands/create-entity-instance.command';
import { EntityService } from '../services/entity.service';
import { EntityInstance } from '../entities/entity-instance.entity';

@CommandHandler(CreateEntityInstanceCommand)
export class CreateEntityInstanceHandler
  implements ICommandHandler<CreateEntityInstanceCommand>
{
  constructor(private readonly entityService: EntityService) {}

  async execute(command: CreateEntityInstanceCommand): Promise<EntityInstance> {
    return this.entityService.createEntityInstance(command.entityTypeId, {
      externalId: command.externalId,
      initialState: command.initialState,
      metadata: command.metadata,
    });
  }
}
