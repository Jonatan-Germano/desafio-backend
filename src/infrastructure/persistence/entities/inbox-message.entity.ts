import {
  Entity,
  PrimaryKey,
  Property,
  Unique,
  Index,
} from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'inbox_messages' })
@Unique({
  name: 'uq_inbox_consumer_message',
  properties: ['consumerName', 'messageId'],
})
@Index({
  name: 'idx_inbox_received_at',
  properties: ['receivedAt'],
})
export class InboxMessageEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'string' })
  messageId!: string;

  @Property({ type: 'string' })
  consumerName!: string;

  @Property({ type: 'string', length: 64 })
  payloadHash!: string;

  @Property({ type: 'timestamptz', defaultRaw: 'now()' })
  receivedAt = new Date();

  @Property({ type: 'timestamptz', nullable: true })
  processedAt?: Date;
}