import {
  Controller,
  Get,
  Query as QueryParam,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from '../services/analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('entity-types/:name/event-counts')
  @ApiOperation({ summary: 'Get event counts by type for a time range' })
  @ApiResponse({ status: 200, description: 'Event counts by type' })
  @ApiQuery({ name: 'startTime', required: true, type: String })
  @ApiQuery({ name: 'endTime', required: true, type: String })
  async getEventCountByType(
    @Param('name') name: string,
    @QueryParam('startTime') startTime: string,
    @QueryParam('endTime') endTime: string,
  ) {
    return this.analyticsService.getEventCountByType(
      name,
      new Date(startTime),
      new Date(endTime),
    );
  }

  @Get('entity-types/:name/time-series')
  @ApiOperation({ summary: 'Get event time series for visualization' })
  @ApiResponse({ status: 200, description: 'Time series data' })
  @ApiQuery({ name: 'startTime', required: true, type: String })
  @ApiQuery({ name: 'endTime', required: true, type: String })
  @ApiQuery({ name: 'interval', required: false, type: String })
  async getEventTimeSeries(
    @Param('name') name: string,
    @QueryParam('startTime') startTime: string,
    @QueryParam('endTime') endTime: string,
    @QueryParam('interval') interval?: string,
  ) {
    return this.analyticsService.getEventTimeSeries(
      name,
      new Date(startTime),
      new Date(endTime),
      interval || '1 hour',
    );
  }

  @Get('entity-types/:typeId/field-aggregation/:field')
  @ApiOperation({ summary: 'Get aggregation statistics for a field' })
  @ApiResponse({ status: 200, description: 'Field aggregation results' })
  async getFieldAggregation(
    @Param('typeId', ParseUUIDPipe) typeId: string,
    @Param('field') field: string,
  ) {
    return this.analyticsService.getFieldAggregation(typeId, field);
  }

  @Get('entity-types/:typeId/field-distribution/:field')
  @ApiOperation({ summary: 'Get distribution of values for a field' })
  @ApiResponse({ status: 200, description: 'Field distribution' })
  @ApiQuery({ name: 'buckets', required: false, type: Number })
  async getFieldDistribution(
    @Param('typeId', ParseUUIDPipe) typeId: string,
    @Param('field') field: string,
    @QueryParam('buckets') buckets?: number,
  ) {
    return this.analyticsService.getFieldDistribution(typeId, field, buckets);
  }

  @Get('instances/:id/change-rate')
  @ApiOperation({ summary: 'Get change rate for an entity instance' })
  @ApiResponse({ status: 200, description: 'Change rate per hour' })
  @ApiQuery({ name: 'startTime', required: true, type: String })
  @ApiQuery({ name: 'endTime', required: true, type: String })
  async getEntityChangeRate(
    @Param('id', ParseUUIDPipe) id: string,
    @QueryParam('startTime') startTime: string,
    @QueryParam('endTime') endTime: string,
  ) {
    const rate = await this.analyticsService.getEntityChangeRate(
      id,
      new Date(startTime),
      new Date(endTime),
    );
    return { entityInstanceId: id, changeRatePerHour: rate };
  }

  @Get('entity-types/:name/most-active')
  @ApiOperation({ summary: 'Get most active entities' })
  @ApiResponse({ status: 200, description: 'Most active entities' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMostActiveEntities(
    @Param('name') name: string,
    @QueryParam('limit') limit?: number,
  ) {
    return this.analyticsService.getMostActiveEntities(name, limit);
  }

  @Get('entity-types/:name/event-distribution')
  @ApiOperation({ summary: 'Get event type distribution' })
  @ApiResponse({ status: 200, description: 'Event type distribution' })
  async getEventTypeDistribution(@Param('name') name: string) {
    return this.analyticsService.getEventTypeDistribution(name);
  }

  @Get('entity-types/:typeId/growth-rate')
  @ApiOperation({ summary: 'Get entity instance growth rate over time' })
  @ApiResponse({ status: 200, description: 'Growth rate time series' })
  @ApiQuery({ name: 'startTime', required: true, type: String })
  @ApiQuery({ name: 'endTime', required: true, type: String })
  async getStateGrowthRate(
    @Param('typeId', ParseUUIDPipe) typeId: string,
    @QueryParam('startTime') startTime: string,
    @QueryParam('endTime') endTime: string,
  ) {
    return this.analyticsService.getStateGrowthRate(
      typeId,
      new Date(startTime),
      new Date(endTime),
    );
  }

  @Get('entity-types/:name/summary')
  @ApiOperation({ summary: 'Get summary statistics for an entity type' })
  @ApiResponse({ status: 200, description: 'Summary statistics' })
  async getSummaryStatistics(@Param('name') name: string) {
    return this.analyticsService.getSummaryStatistics(name);
  }
}
