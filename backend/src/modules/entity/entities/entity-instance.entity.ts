import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EntityType } from './entity-type.entity';

@Entity('entity_instances')
@Index(['entityTypeId', 'externalId'], { unique: true })
export class EntityInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_type_id' })
  entityTypeId: string;

  @Column({ name: 'external_id' })
  externalId: string;

  @Column({ type: 'jsonb' })
  currentState: Record<string, unknown>;

  @Column({ type: 'bigint', default: 0 })
  version: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => EntityType, (type) => type.instances)
  @JoinColumn({ name: 'entity_type_id' })
  entityType: EntityType;
}
