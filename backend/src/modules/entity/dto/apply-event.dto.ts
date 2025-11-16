import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class ApplyEventDto {
  @ApiProperty({
    description: 'Type of event being applied',
    example: 'ScoreUpdated',
  })
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @ApiProperty({
    description: 'Event payload containing the changes',
    example: { delta: 10, reason: 'level_complete' },
  })
  @IsObject()
  @IsNotEmpty()
  payload: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Optional correlation ID for tracking',
    example: 'req-456',
  })
  @IsString()
  @IsOptional()
  correlationId?: string;

  @ApiPropertyOptional({
    description: 'Optional causation ID for event chain tracking',
    example: 'event-789',
  })
  @IsString()
  @IsOptional()
  causationId?: string;

  @ApiPropertyOptional({
    description: 'Additional event metadata',
    example: { triggeredBy: 'game_server', timestamp: '2024-01-01T00:00:00Z' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
