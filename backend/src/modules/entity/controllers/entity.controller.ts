import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CreateEntityTypeCommand } from '../commands/create-entity-type.command';
import { CreateEntityInstanceCommand } from '../commands/create-entity-instance.command';
import { ApplyEventCommand } from '../commands/apply-event.command';
import { EntityService } from '../services/entity.service';
import { CreateEntityTypeDto } from '../dto/create-entity-type.dto';
import { CreateEntityInstanceDto } from '../dto/create-entity-instance.dto';
import { ApplyEventDto } from '../dto/apply-event.dto';

@ApiTags('entities')
@Controller('entities')
export class EntityController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly entityService: EntityService,
  ) {}

  // Entity Type Endpoints
  @Post('types')
  @ApiOperation({ summary: 'Create a new entity type' })
  @ApiResponse({ status: 201, description: 'Entity type created successfully' })
  @ApiResponse({ status: 409, description: 'Entity type already exists' })
  async createEntityType(@Body() dto: CreateEntityTypeDto) {
    return this.commandBus.execute(
      new CreateEntityTypeCommand(
        dto.name,
        dto.schema,
        dto.description,
        dto.metadata,
      ),
    );
  }

  @Get('types')
  @ApiOperation({ summary: 'List all entity types' })
  @ApiResponse({ status: 200, description: 'List of entity types' })
  async listEntityTypes() {
    return this.entityService.listEntityTypes();
  }

  @Get('types/:id')
  @ApiOperation({ summary: 'Get entity type by ID' })
  @ApiResponse({ status: 200, description: 'Entity type details' })
  @ApiResponse({ status: 404, description: 'Entity type not found' })
  async getEntityType(@Param('id', ParseUUIDPipe) id: string) {
    return this.entityService.getEntityType(id);
  }

  @Get('types/name/:name')
  @ApiOperation({ summary: 'Get entity type by name' })
  @ApiResponse({ status: 200, description: 'Entity type details' })
  @ApiResponse({ status: 404, description: 'Entity type not found' })
  async getEntityTypeByName(@Param('name') name: string) {
    return this.entityService.getEntityTypeByName(name);
  }

  @Put('types/:id/schema')
  @ApiOperation({ summary: 'Update entity type schema' })
  @ApiResponse({ status: 200, description: 'Schema updated successfully' })
  async updateEntityTypeSchema(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() schema: Record<string, unknown>,
  ) {
    return this.entityService.updateEntityTypeSchema(id, schema);
  }

  // Entity Instance Endpoints
  @Post('types/:typeId/instances')
  @ApiOperation({ summary: 'Create a new entity instance' })
  @ApiResponse({
    status: 201,
    description: 'Entity instance created successfully',
  })
  @ApiResponse({ status: 404, description: 'Entity type not found' })
  @ApiResponse({
    status: 409,
    description: 'Entity instance with external ID already exists',
  })
  async createEntityInstance(
    @Param('typeId', ParseUUIDPipe) typeId: string,
    @Body() dto: CreateEntityInstanceDto,
  ) {
    return this.commandBus.execute(
      new CreateEntityInstanceCommand(
        typeId,
        dto.externalId,
        dto.initialState,
        dto.metadata,
      ),
    );
  }

  @Get('types/:typeId/instances')
  @ApiOperation({ summary: 'List entity instances for a type' })
  @ApiResponse({ status: 200, description: 'List of entity instances' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async listEntityInstances(
    @Param('typeId', ParseUUIDPipe) typeId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.entityService.listEntityInstances(typeId, limit, offset);
  }

  @Get('instances/:id')
  @ApiOperation({ summary: 'Get entity instance by ID' })
  @ApiResponse({ status: 200, description: 'Entity instance details' })
  @ApiResponse({ status: 404, description: 'Entity instance not found' })
  async getEntityInstance(@Param('id', ParseUUIDPipe) id: string) {
    return this.entityService.getEntityInstance(id);
  }

  @Get('types/:typeId/instances/external/:externalId')
  @ApiOperation({ summary: 'Get entity instance by external ID' })
  @ApiResponse({ status: 200, description: 'Entity instance details' })
  @ApiResponse({ status: 404, description: 'Entity instance not found' })
  async getEntityInstanceByExternalId(
    @Param('typeId', ParseUUIDPipe) typeId: string,
    @Param('externalId') externalId: string,
  ) {
    return this.entityService.getEntityInstanceByExternalId(typeId, externalId);
  }

  @Get('types/:typeId/instances/external/:externalId/current')
  @ApiOperation({ summary: 'Get current state (fast, from cache)' })
  @ApiResponse({ status: 200, description: 'Current state of entity' })
  async getCurrentStateFast(
    @Param('typeId', ParseUUIDPipe) typeId: string,
    @Param('externalId') externalId: string,
  ) {
    return this.entityService.getCurrentStateFast(typeId, externalId);
  }

  // Event Application
  @Post('instances/:id/events')
  @ApiOperation({ summary: 'Apply an event to an entity instance' })
  @ApiResponse({ status: 201, description: 'Event applied successfully' })
  @ApiResponse({ status: 404, description: 'Entity instance not found' })
  async applyEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyEventDto,
  ) {
    return this.commandBus.execute(
      new ApplyEventCommand(
        id,
        dto.eventType,
        dto.payload,
        dto.correlationId,
        dto.causationId,
        dto.metadata,
      ),
    );
  }
}
