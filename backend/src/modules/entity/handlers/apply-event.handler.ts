import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApplyEventCommand } from '../commands/apply-event.command';
import { EntityService } from '../services/entity.service';
import { EntityInstance } from '../entities/entity-instance.entity';

@CommandHandler(ApplyEventCommand)
export class ApplyEventHandler implements ICommandHandler<ApplyEventCommand> {
  constructor(private readonly entityService: EntityService) {}

  async execute(
    command: ApplyEventCommand,
  ): Promise<{ instance: EntityInstance; event: unknown }> {
    return this.entityService.applyGenericEvent(command.entityInstanceId, {
      eventType: command.eventType,
      payload: command.payload,
      correlationId: command.correlationId,
      causationId: command.causationId,
      metadata: command.metadata,
    });
  }
}
