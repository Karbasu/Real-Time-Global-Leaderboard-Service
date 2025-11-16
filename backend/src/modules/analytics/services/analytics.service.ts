import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Event } from '../../event-store/entities/event.entity';
import { EntityInstance } from '../../entity/entities/entity-instance.entity';
import { EventStoreService } from '../../event-store/services/event-store.service';

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

export interface AggregationResult {
  min: number;
  max: number;
  avg: number;
  sum: number;
  count: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(EntityInstance)
    private readonly entityInstanceRepository: Repository<EntityInstance>,
    private readonly eventStoreService: EventStoreService,
  ) {}

  async getEventCountByType(
    entityTypeName: string,
    startTime: Date,
    endTime: Date,
  ): Promise<Record<string, number>> {
    const result = await this.eventRepository
      .createQueryBuilder('event')
      .select('event.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .where('event.entityTypeName = :entityTypeName', { entityTypeName })
      .andWhere('event.timestamp BETWEEN :startTime AND :endTime', {
        startTime,
        endTime,
      })
      .groupBy('event.eventType')
      .getRawMany();

    const counts: Record<string, number> = {};
    for (const row of result) {
      counts[row.eventType] = parseInt(row.count, 10);
    }

    return counts;
  }

  async getEventTimeSeries(
    entityTypeName: string,
    startTime: Date,
    endTime: Date,
    bucketInterval: string = '1 hour',
  ): Promise<TimeSeriesPoint[]> {
    const result = await this.eventRepository.query(
      `
      SELECT
        time_bucket($1, timestamp) AS bucket,
        COUNT(*) as count
      FROM events
      WHERE entity_type_name = $2
        AND timestamp BETWEEN $3 AND $4
      GROUP BY bucket
      ORDER BY bucket ASC
    `,
      [bucketInterval, entityTypeName, startTime, endTime],
    );

    return result.map((row: { bucket: Date; count: string }) => ({
      timestamp: row.bucket,
      value: parseInt(row.count, 10),
    }));
  }

  async getFieldAggregation(
    entityTypeId: string,
    field: string,
  ): Promise<AggregationResult> {
    const instances = await this.entityInstanceRepository.find({
      where: { entityTypeId },
    });

    const values: number[] = [];
    for (const instance of instances) {
      const value = instance.currentState[field];
      if (typeof value === 'number') {
        values.push(value);
      }
    }

    if (values.length === 0) {
      return { min: 0, max: 0, avg: 0, sum: 0, count: 0 };
    }

    const sum = values.reduce((a, b) => a + b, 0);

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
      sum,
      count: values.length,
    };
  }

  async getFieldDistribution(
    entityTypeId: string,
    field: string,
    bucketCount: number = 10,
  ): Promise<Array<{ bucket: string; count: number }>> {
    const instances = await this.entityInstanceRepository.find({
      where: { entityTypeId },
    });

    const values: number[] = [];
    for (const instance of instances) {
      const value = instance.currentState[field];
      if (typeof value === 'number') {
        values.push(value);
      }
    }

    if (values.length === 0) {
      return [];
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const bucketSize = (max - min) / bucketCount;

    const buckets: Map<number, number> = new Map();
    for (let i = 0; i < bucketCount; i++) {
      buckets.set(i, 0);
    }

    for (const value of values) {
      const bucketIndex = Math.min(
        Math.floor((value - min) / bucketSize),
        bucketCount - 1,
      );
      buckets.set(bucketIndex, (buckets.get(bucketIndex) || 0) + 1);
    }

    const result: Array<{ bucket: string; count: number }> = [];
    for (let i = 0; i < bucketCount; i++) {
      const bucketMin = min + i * bucketSize;
      const bucketMax = min + (i + 1) * bucketSize;
      result.push({
        bucket: `${bucketMin.toFixed(2)} - ${bucketMax.toFixed(2)}`,
        count: buckets.get(i) || 0,
      });
    }

    return result;
  }

  async getEntityChangeRate(
    entityInstanceId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<number> {
    const events = await this.eventStoreService.getEventsInTimeRange(
      entityInstanceId,
      startTime,
      endTime,
    );

    const timeDiffHours =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    return events.length / timeDiffHours;
  }

  async getMostActiveEntities(
    entityTypeName: string,
    limit: number = 10,
  ): Promise<Array<{ entityInstanceId: string; eventCount: number }>> {
    const result = await this.eventRepository
      .createQueryBuilder('event')
      .select('event.entityInstanceId', 'entityInstanceId')
      .addSelect('COUNT(*)', 'eventCount')
      .where('event.entityTypeName = :entityTypeName', { entityTypeName })
      .groupBy('event.entityInstanceId')
      .orderBy('eventCount', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((row) => ({
      entityInstanceId: row.entityInstanceId,
      eventCount: parseInt(row.eventCount, 10),
    }));
  }

  async getEventTypeDistribution(
    entityTypeName: string,
  ): Promise<Array<{ eventType: string; percentage: number; count: number }>> {
    const stats =
      await this.eventStoreService.getEventStatistics(entityTypeName);
    const total = stats.totalEvents;

    if (total === 0) {
      return [];
    }

    const distribution: Array<{
      eventType: string;
      percentage: number;
      count: number;
    }> = [];

    for (const [eventType, count] of Object.entries(stats.eventsByType)) {
      distribution.push({
        eventType,
        count,
        percentage: (count / total) * 100,
      });
    }

    return distribution.sort((a, b) => b.count - a.count);
  }

  async getStateGrowthRate(
    entityTypeId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<TimeSeriesPoint[]> {
    const result = await this.entityInstanceRepository.query(
      `
      SELECT
        time_bucket('1 day', created_at) AS bucket,
        COUNT(*) as count
      FROM entity_instances
      WHERE entity_type_id = $1
        AND created_at BETWEEN $2 AND $3
      GROUP BY bucket
      ORDER BY bucket ASC
    `,
      [entityTypeId, startTime, endTime],
    );

    return result.map((row: { bucket: Date; count: string }) => ({
      timestamp: row.bucket,
      value: parseInt(row.count, 10),
    }));
  }

  async getSummaryStatistics(entityTypeName: string) {
    const eventStats =
      await this.eventStoreService.getEventStatistics(entityTypeName);
    const instanceCount = await this.entityInstanceRepository.count();

    return {
      entityTypeName,
      totalInstances: instanceCount,
      totalEvents: eventStats.totalEvents,
      eventsByType: eventStats.eventsByType,
      lastEventTime: eventStats.lastEventTime,
      averageEventsPerInstance:
        instanceCount > 0 ? eventStats.totalEvents / instanceCount : 0,
    };
  }
}
