import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { EntityType } from '../entities/entity-type.entity';
import { EntityInstance } from '../entities/entity-instance.entity';
import { EventStoreService, EventData } from '../../event-store/services/event-store.service';
import { CacheService } from '../../cache/services/cache.service';
import { NatsPublisherService } from '../../event-store/services/nats-publisher.service';
import { CreateEntityTypeDto } from '../dto/create-entity-type.dto';
import { CreateEntityInstanceDto } from '../dto/create-entity-instance.dto';
import { ApplyEventDto } from '../dto/apply-event.dto';

@Injectable()
export class EntityService {
  private readonly logger = new Logger(EntityService.name);

  constructor(
    @InjectRepository(EntityType)
    private readonly entityTypeRepository: Repository<EntityType>,
    @InjectRepository(EntityInstance)
    private readonly entityInstanceRepository: Repository<EntityInstance>,
    private readonly eventStoreService: EventStoreService,
    private readonly cacheService: CacheService,
    private readonly natsPublisherService: NatsPublisherService,
  ) {}

  // Entity Type Operations
  async createEntityType(dto: CreateEntityTypeDto): Promise<EntityType> {
    const existing = await this.entityTypeRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Entity type '${dto.name}' already exists`);
    }

    const entityType = this.entityTypeRepository.create({
      id: uuidv4(),
      name: dto.name,
      description: dto.description,
      schema: dto.schema,
      metadata: dto.metadata || {},
    });

    const saved = await this.entityTypeRepository.save(entityType);
    this.logger.log(`Created entity type: ${saved.name}`);

    return saved;
  }

  async getEntityType(id: string): Promise<EntityType> {
    const entityType = await this.entityTypeRepository.findOne({
      where: { id },
    });

    if (!entityType) {
      throw new NotFoundException(`Entity type ${id} not found`);
    }

    return entityType;
  }

  async getEntityTypeByName(name: string): Promise<EntityType> {
    const entityType = await this.entityTypeRepository.findOne({
      where: { name },
    });

    if (!entityType) {
      throw new NotFoundException(`Entity type '${name}' not found`);
    }

    return entityType;
  }

  async listEntityTypes(): Promise<EntityType[]> {
    return this.entityTypeRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async updateEntityTypeSchema(
    id: string,
    schema: Record<string, unknown>,
  ): Promise<EntityType> {
    const entityType = await this.getEntityType(id);
    entityType.schema = schema;
    return this.entityTypeRepository.save(entityType);
  }

  // Entity Instance Operations
  async createEntityInstance(
    entityTypeId: string,
    dto: CreateEntityInstanceDto,
  ): Promise<EntityInstance> {
    const entityType = await this.getEntityType(entityTypeId);

    // Check for duplicate external ID
    const existing = await this.entityInstanceRepository.findOne({
      where: {
        entityTypeId,
        externalId: dto.externalId,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Entity instance with external ID '${dto.externalId}' already exists`,
      );
    }

    const instance = this.entityInstanceRepository.create({
      id: uuidv4(),
      entityTypeId,
      externalId: dto.externalId,
      currentState: dto.initialState,
      version: 1,
      metadata: dto.metadata || {},
    });

    const saved = await this.entityInstanceRepository.save(instance);

    // Store initial event
    const eventData: EventData = {
      entityInstanceId: saved.id,
      entityTypeName: entityType.name,
      eventType: 'EntityCreated',
      version: 1,
      payload: { initialState: dto.initialState },
      previousState: null,
      newState: dto.initialState,
      metadata: dto.metadata,
    };

    await this.eventStoreService.appendEvent(eventData);

    // Cache current state
    await this.cacheService.setCurrentState(
      entityTypeId,
      dto.externalId,
      dto.initialState,
      1,
    );

    // Publish to NATS
    await this.natsPublisherService.publishEntityCreated(
      entityType.name,
      saved.id,
      dto.externalId,
      dto.initialState,
    );

    this.logger.log(
      `Created entity instance: ${saved.id} (${entityType.name}:${dto.externalId})`,
    );

    return saved;
  }

  async getEntityInstance(id: string): Promise<EntityInstance> {
    const instance = await this.entityInstanceRepository.findOne({
      where: { id },
      relations: ['entityType'],
    });

    if (!instance) {
      throw new NotFoundException(`Entity instance ${id} not found`);
    }

    return instance;
  }

  async getEntityInstanceByExternalId(
    entityTypeId: string,
    externalId: string,
  ): Promise<EntityInstance> {
    const instance = await this.entityInstanceRepository.findOne({
      where: { entityTypeId, externalId },
      relations: ['entityType'],
    });

    if (!instance) {
      throw new NotFoundException(
        `Entity instance with external ID '${externalId}' not found`,
      );
    }

    return instance;
  }

  async listEntityInstances(
    entityTypeId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<{ instances: EntityInstance[]; total: number }> {
    const [instances, total] = await this.entityInstanceRepository.findAndCount({
      where: { entityTypeId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { instances, total };
  }

  // Event Application
  async applyEvent(
    instanceId: string,
    dto: ApplyEventDto,
    stateTransformer: (
      currentState: Record<string, unknown>,
      payload: Record<string, unknown>,
    ) => Record<string, unknown>,
  ): Promise<{ instance: EntityInstance; event: Event }> {
    const instance = await this.getEntityInstance(instanceId);
    const entityType = instance.entityType;

    const previousState = { ...instance.currentState };
    const newState = stateTransformer(instance.currentState, dto.payload);

    // Increment version
    const newVersion = Number(instance.version) + 1;

    // Create event
    const eventData: EventData = {
      entityInstanceId: instance.id,
      entityTypeName: entityType.name,
      eventType: dto.eventType,
      version: newVersion,
      payload: dto.payload,
      previousState,
      newState,
      metadata: dto.metadata,
      correlationId: dto.correlationId,
      causationId: dto.causationId,
    };

    const event = await this.eventStoreService.appendEvent(eventData);

    // Update instance
    instance.currentState = newState;
    instance.version = newVersion;
    const updatedInstance = await this.entityInstanceRepository.save(instance);

    // Update cache
    await this.cacheService.setCurrentState(
      entityType.id,
      instance.externalId,
      newState,
      newVersion,
    );

    // Publish event
    await this.natsPublisherService.publishEvent(event);

    this.logger.log(
      `Applied event ${dto.eventType} to ${instance.id} (version ${newVersion})`,
    );

    return { instance: updatedInstance, event };
  }

  async applyGenericEvent(
    instanceId: string,
    dto: ApplyEventDto,
  ): Promise<{ instance: EntityInstance; event: Event }> {
    // Default transformer: merge payload into state
    const transformer = (
      currentState: Record<string, unknown>,
      payload: Record<string, unknown>,
    ) => {
      return { ...currentState, ...payload };
    };

    return this.applyEvent(instanceId, dto, transformer);
  }

  // Cache Operations
  async getCurrentStateFast(
    entityTypeId: string,
    externalId: string,
  ): Promise<{
    state: Record<string, unknown>;
    version: number;
    fromCache: boolean;
  }> {
    // Try cache first
    const cached = await this.cacheService.getCurrentState(
      entityTypeId,
      externalId,
    );

    if (cached) {
      return { ...cached, fromCache: true };
    }

    // Fallback to database
    const instance = await this.getEntityInstanceByExternalId(
      entityTypeId,
      externalId,
    );

    // Cache for next time
    await this.cacheService.setCurrentState(
      entityTypeId,
      externalId,
      instance.currentState,
      Number(instance.version),
    );

    return {
      state: instance.currentState,
      version: Number(instance.version),
      fromCache: false,
    };
  }
}

// Import Event type for return signature
import { Event } from '../../event-store/entities/event.entity';
