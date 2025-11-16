import {
  Controller,
  Get,
  Query as QueryParam,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { QueryService } from '../services/query.service';

@ApiTags('queries')
@Controller('queries')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Get('instances/:id/history')
  @ApiOperation({ summary: 'Get event history for an entity instance' })
  @ApiResponse({ status: 200, description: 'Event history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getEventHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @QueryParam('limit') limit?: number,
    @QueryParam('offset') offset?: number,
  ) {
    return this.queryService.getEventHistory(id, limit, offset);
  }

  @Get('instances/:id/state/at-version/:version')
  @ApiOperation({ summary: 'Get state at a specific version' })
  @ApiResponse({ status: 200, description: 'State at version' })
  async getStateAtVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('version') version: number,
  ) {
    return this.queryService.getHistoricalState({
      entityInstanceId: id,
      version,
    });
  }

  @Get('instances/:id/state/at-time')
  @ApiOperation({ summary: 'Get state at a specific timestamp' })
  @ApiResponse({ status: 200, description: 'State at timestamp' })
  @ApiQuery({ name: 'timestamp', required: true, type: String })
  async getStateAtTimestamp(
    @Param('id', ParseUUIDPipe) id: string,
    @QueryParam('timestamp') timestamp: string,
  ) {
    return this.queryService.getHistoricalState({
      entityInstanceId: id,
      timestamp: new Date(timestamp),
    });
  }

  @Get('instances/:id/events/time-range')
  @ApiOperation({ summary: 'Get events in a time range' })
  @ApiResponse({ status: 200, description: 'Events in time range' })
  @ApiQuery({ name: 'startTime', required: true, type: String })
  @ApiQuery({ name: 'endTime', required: true, type: String })
  async getEventsInTimeRange(
    @Param('id', ParseUUIDPipe) id: string,
    @QueryParam('startTime') startTime: string,
    @QueryParam('endTime') endTime: string,
  ) {
    return this.queryService.getEventsInTimeRange({
      entityInstanceId: id,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    });
  }

  @Get('instances/:id/compare')
  @ApiOperation({ summary: 'Compare two versions of an entity' })
  @ApiResponse({ status: 200, description: 'Version comparison' })
  @ApiQuery({ name: 'version1', required: true, type: Number })
  @ApiQuery({ name: 'version2', required: true, type: Number })
  async compareVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @QueryParam('version1') version1: number,
    @QueryParam('version2') version2: number,
  ) {
    return this.queryService.compareVersions(id, version1, version2);
  }

  @Get('instances/:id/timeline/:field')
  @ApiOperation({ summary: 'Get timeline of a specific field' })
  @ApiResponse({ status: 200, description: 'Field timeline' })
  async getFieldTimeline(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('field') field: string,
  ) {
    return this.queryService.getStateTimeline(id, field);
  }

  @Get('instances/:id/snapshot-info')
  @ApiOperation({ summary: 'Get snapshot information for an entity' })
  @ApiResponse({ status: 200, description: 'Snapshot information' })
  async getSnapshotInfo(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryService.getSnapshotInfo(id);
  }

  @Get('instances/:id/version-count')
  @ApiOperation({ summary: 'Get total version count for an entity' })
  @ApiResponse({ status: 200, description: 'Version count' })
  async getVersionCount(@Param('id', ParseUUIDPipe) id: string) {
    const count = await this.queryService.getEntityVersionCount(id);
    return { entityInstanceId: id, versionCount: count };
  }
}
