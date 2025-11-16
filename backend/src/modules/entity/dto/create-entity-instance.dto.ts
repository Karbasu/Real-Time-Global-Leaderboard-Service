import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class CreateEntityInstanceDto {
  @ApiProperty({
    description: 'External identifier for the entity instance',
    example: 'user-123',
  })
  @IsString()
  @IsNotEmpty()
  externalId: string;

  @ApiProperty({
    description: 'Initial state of the entity',
    example: { username: 'john_doe', email: 'john@example.com', score: 0 },
  })
  @IsObject()
  @IsNotEmpty()
  initialState: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Additional metadata for the instance',
    example: { source: 'registration', region: 'us-east' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
