import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Event } from '../entities/event.entity';
import { Snapshot } from '../entities/snapshot.entity';
import { v4 as uuidv4 } from 'uuid';

export interface EventData {
  entityInstanceId: string;
  entityTypeName: string;
  eventType: string;
  version: number;
  payload: Record<string, unknown>;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  causationId?: string;
}

@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);
  private readonly SNAPSHOT_INTERVAL = 10;

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Snapshot)
    private readonly snapshotRepository: Repository<Snapshot>,
  ) {}

  async appendEvent(eventData: EventData): Promise<Event> {
    const event = this.eventRepository.create({
      id: uuidv4(),
      ...eventData,
    });

    const savedEvent = await this.eventRepository.save(event);
    this.logger.debug(
      `Event ${savedEvent.id} appended for entity ${eventData.entityInstanceId}`,
    );

    // Create snapshot periodically
    if (eventData.version % this.SNAPSHOT_INTERVAL === 0) {
      await this.createSnapshot(
        eventData.entityInstanceId,
        eventData.version,
        eventData.newState,
      );
    }

    return savedEvent;
  }

  async getEvents(
    entityInstanceId: string,
    fromVersion?: number,
    toVersion?: number,
  ): Promise<Event[]> {
    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .where('event.entityInstanceId = :entityInstanceId', {
        entityInstanceId,
      })
      .orderBy('event.version', 'ASC');

    if (fromVersion !== undefined) {
      queryBuilder.andWhere('event.version >= :fromVersion', { fromVersion });
    }

    if (toVersion !== undefined) {
      queryBuilder.andWhere('event.version <= :toVersion', { toVersion });
    }

    return queryBuilder.getMany();
  }

  async getEventsInTimeRange(
    entityInstanceId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<Event[]> {
    return this.eventRepository
      .createQueryBuilder('event')
      .where('event.entityInstanceId = :entityInstanceId', {
        entityInstanceId,
      })
      .andWhere('event.timestamp >= :startTime', { startTime })
      .andWhere('event.timestamp <= :endTime', { endTime })
      .orderBy('event.timestamp', 'ASC')
      .getMany();
  }

  async getEventsByType(
    eventType: string,
    limit: number = 100,
  ): Promise<Event[]> {
    return this.eventRepository.find({
      where: { eventType },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async createSnapshot(
    entityInstanceId: string,
    version: number,
    state: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ): Promise<Snapshot> {
    const snapshot = this.snapshotRepository.create({
      id: uuidv4(),
      entityInstanceId,
      version,
      state,
      metadata,
    });

    const savedSnapshot = await this.snapshotRepository.save(snapshot);
    this.logger.debug(
      `Snapshot created for entity ${entityInstanceId} at version ${version}`,
    );

    return savedSnapshot;
  }

  async getLatestSnapshot(entityInstanceId: string): Promise<Snapshot | null> {
    return this.snapshotRepository.findOne({
      where: { entityInstanceId },
      order: { version: 'DESC' },
    });
  }

  async getSnapshotAtVersion(
    entityInstanceId: string,
    version: number,
  ): Promise<Snapshot | null> {
    return this.snapshotRepository.findOne({
      where: {
        entityInstanceId,
        version: LessThanOrEqual(version),
      },
      order: { version: 'DESC' },
    });
  }

  async rebuildState(
    entityInstanceId: string,
    targetVersion?: number,
  ): Promise<Record<string, unknown>> {
    // Get latest snapshot before target version
    const snapshot = targetVersion
      ? await this.getSnapshotAtVersion(entityInstanceId, targetVersion)
      : await this.getLatestSnapshot(entityInstanceId);

    let currentState: Record<string, unknown> = {};
    let fromVersion = 1;

    if (snapshot) {
      currentState = snapshot.state;
      fromVersion = Number(snapshot.version) + 1;
    }

    // Apply events from snapshot to target version
    const events = await this.getEvents(
      entityInstanceId,
      fromVersion,
      targetVersion,
    );

    for (const event of events) {
      currentState = event.newState;
    }

    return currentState;
  }

  async getStateAtTimestamp(
    entityInstanceId: string,
    timestamp: Date,
  ): Promise<Record<string, unknown> | null> {
    const event = await this.eventRepository.findOne({
      where: {
        entityInstanceId,
        timestamp: LessThanOrEqual(timestamp),
      },
      order: { timestamp: 'DESC' },
    });

    return event ? event.newState : null;
  }

  async countEvents(entityInstanceId: string): Promise<number> {
    return this.eventRepository.count({
      where: { entityInstanceId },
    });
  }

  async getEventStatistics(entityTypeName: string): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    lastEventTime: Date | null;
  }> {
    const totalEvents = await this.eventRepository.count({
      where: { entityTypeName },
    });

    const eventsByTypeResult = await this.eventRepository
      .createQueryBuilder('event')
      .select('event.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .where('event.entityTypeName = :entityTypeName', { entityTypeName })
      .groupBy('event.eventType')
      .getRawMany();

    const eventsByType: Record<string, number> = {};
    for (const row of eventsByTypeResult) {
      eventsByType[row.eventType] = parseInt(row.count, 10);
    }

    const lastEvent = await this.eventRepository.findOne({
      where: { entityTypeName },
      order: { timestamp: 'DESC' },
    });

    return {
      totalEvents,
      eventsByType,
      lastEventTime: lastEvent ? lastEvent.timestamp : null,
    };
  }
}
