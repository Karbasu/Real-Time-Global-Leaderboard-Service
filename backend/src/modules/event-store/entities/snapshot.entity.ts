import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('snapshots')
@Index(['entityInstanceId', 'version'])
export class Snapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_instance_id' })
  entityInstanceId: string;

  @Column({ type: 'bigint' })
  version: number;

  @Column({ type: 'jsonb' })
  state: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
