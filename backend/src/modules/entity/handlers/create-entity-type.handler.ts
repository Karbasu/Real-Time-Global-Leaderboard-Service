import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateEntityTypeCommand } from '../commands/create-entity-type.command';
import { EntityService } from '../services/entity.service';
import { EntityType } from '../entities/entity-type.entity';

@CommandHandler(CreateEntityTypeCommand)
export class CreateEntityTypeHandler
  implements ICommandHandler<CreateEntityTypeCommand>
{
  constructor(private readonly entityService: EntityService) {}

  async execute(command: CreateEntityTypeCommand): Promise<EntityType> {
    return this.entityService.createEntityType({
      name: command.name,
      schema: command.schema,
      description: command.description,
      metadata: command.metadata,
    });
  }
}
