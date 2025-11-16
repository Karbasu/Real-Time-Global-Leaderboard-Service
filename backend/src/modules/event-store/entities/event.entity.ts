import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('events')
@Index(['entityInstanceId', 'version'])
@Index(['entityInstanceId', 'timestamp'])
@Index(['eventType', 'timestamp'])
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_instance_id' })
  entityInstanceId: string;

  @Column({ name: 'entity_type_name' })
  entityTypeName: string;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column({ type: 'bigint' })
  version: number;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'previous_state', nullable: true })
  previousState: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'new_state' })
  newState: Record<string, unknown>;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;

  @Column({ name: 'correlation_id', nullable: true })
  correlationId: string;

  @Column({ name: 'causation_id', nullable: true })
  causationId: string;
}
