import { Injectable, NotFoundException } from '@nestjs/common';
import { EventStoreService } from '../../event-store/services/event-store.service';
import { EntityService } from '../../entity/services/entity.service';

export interface HistoricalStateQuery {
  entityInstanceId: string;
  timestamp?: Date;
  version?: number;
}

export interface TimeRangeQuery {
  entityInstanceId: string;
  startTime: Date;
  endTime: Date;
}

export interface StateComparison {
  version1: number;
  version2: number;
  state1: Record<string, unknown>;
  state2: Record<string, unknown>;
  changes: Record<string, { from: unknown; to: unknown }>;
}

@Injectable()
export class QueryService {
  constructor(
    private readonly eventStoreService: EventStoreService,
    private readonly entityService: EntityService,
  ) {}

  async getHistoricalState(
    query: HistoricalStateQuery,
  ): Promise<Record<string, unknown>> {
    if (query.timestamp) {
      const state = await this.eventStoreService.getStateAtTimestamp(
        query.entityInstanceId,
        query.timestamp,
      );

      if (!state) {
        throw new NotFoundException(
          `No state found for entity ${query.entityInstanceId} at ${query.timestamp}`,
        );
      }

      return state;
    }

    if (query.version !== undefined) {
      return this.eventStoreService.rebuildState(
        query.entityInstanceId,
        query.version,
      );
    }

    // Return current state
    const instance = await this.entityService.getEntityInstance(
      query.entityInstanceId,
    );
    return instance.currentState;
  }

  async getEventsInTimeRange(query: TimeRangeQuery) {
    return this.eventStoreService.getEventsInTimeRange(
      query.entityInstanceId,
      query.startTime,
      query.endTime,
    );
  }

  async getEventHistory(
    entityInstanceId: string,
    limit: number = 100,
    offset: number = 0,
  ) {
    const events = await this.eventStoreService.getEvents(entityInstanceId);
    const total = events.length;
    const paginatedEvents = events.slice(offset, offset + limit);

    return {
      events: paginatedEvents,
      total,
      limit,
      offset,
    };
  }

  async compareVersions(
    entityInstanceId: string,
    version1: number,
    version2: number,
  ): Promise<StateComparison> {
    const state1 = await this.eventStoreService.rebuildState(
      entityInstanceId,
      version1,
    );
    const state2 = await this.eventStoreService.rebuildState(
      entityInstanceId,
      version2,
    );

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const allKeys = new Set([...Object.keys(state1), ...Object.keys(state2)]);

    for (const key of allKeys) {
      const val1 = state1[key];
      const val2 = state2[key];

      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        changes[key] = { from: val1, to: val2 };
      }
    }

    return {
      version1,
      version2,
      state1,
      state2,
      changes,
    };
  }

  async getStateTimeline(
    entityInstanceId: string,
    field: string,
  ): Promise<Array<{ timestamp: Date; version: number; value: unknown }>> {
    const events = await this.eventStoreService.getEvents(entityInstanceId);
    const timeline: Array<{
      timestamp: Date;
      version: number;
      value: unknown;
    }> = [];

    for (const event of events) {
      const value = event.newState[field];
      timeline.push({
        timestamp: event.timestamp,
        version: Number(event.version),
        value,
      });
    }

    return timeline;
  }

  async searchEventsByCorrelationId(correlationId: string) {
    const { InjectRepository } = require('@nestjs/typeorm');
    // This would need to be injected properly, but for now we'll use the event store
    return this.eventStoreService.getEventsByType(correlationId);
  }

  async getEntityVersionCount(entityInstanceId: string): Promise<number> {
    return this.eventStoreService.countEvents(entityInstanceId);
  }

  async getSnapshotInfo(entityInstanceId: string) {
    const snapshot =
      await this.eventStoreService.getLatestSnapshot(entityInstanceId);
    const totalEvents =
      await this.eventStoreService.countEvents(entityInstanceId);

    return {
      latestSnapshot: snapshot,
      totalEvents,
      eventsSinceSnapshot: snapshot
        ? totalEvents - Number(snapshot.version)
        : totalEvents,
    };
  }
}
