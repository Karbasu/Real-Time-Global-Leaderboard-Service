import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateEntityTypeDto {
  @ApiProperty({
    description: 'Unique name for the entity type',
    example: 'user_profile',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the entity type',
    example: 'User profile data including preferences and settings',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'JSON schema defining the structure of entity instances',
    example: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        email: { type: 'string' },
        score: { type: 'number' },
      },
      required: ['username', 'email'],
    },
  })
  @IsObject()
  @IsNotEmpty()
  schema: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Additional metadata for the entity type',
    example: { version: '1.0', category: 'user' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
