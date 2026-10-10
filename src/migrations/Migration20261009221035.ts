import { Migration } from '@mikro-orm/migrations';

export class Migration20261009221035 extends Migration {

  override name = 'Migration20261009221035';

  override up(): void | Promise<void> {
    this.addSql(`create table "inbox_messages" ("id" uuid not null, "message_id" varchar(255) not null, "consumer_name" varchar(255) not null, "payload_hash" varchar(64) not null, "received_at" timestamptz not null default now(), "processed_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "idx_inbox_received_at" on "inbox_messages" ("received_at");`);
    this.addSql(`alter table "inbox_messages" add constraint "uq_inbox_consumer_message" unique ("consumer_name", "message_id");`);

    this.addSql(`create table "outbox_messages" ("id" uuid not null, "aggregate_id" uuid not null, "event_type" varchar(255) not null, "payload" jsonb not null, "occurred_at" timestamptz not null default now(), "attempts" int not null default 0, "next_attempt_at" timestamptz null, "published_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "idx_outbox_pending" on "outbox_messages" ("published_at", "next_attempt_at", "occurred_at");`);

    this.addSql(`create table "users" ("id" uuid not null, "email" varchar(255) not null, "name" varchar(100) null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`alter table "users" add constraint "uq_users_email" unique ("email");`);

    this.addSql(`create table "wager_transactions" ("id" uuid not null, "provider_id" varchar(255) not null, "external_transaction_id" varchar(255) not null, "idempotency_key" varchar(255) not null, "payload_hash" varchar(64) not null, "wallet_id" uuid not null, "player_id" uuid not null, "round_id" varchar(255) not null, "game_id" varchar(255) not null, "kind" varchar(16) not null, "amount" numeric(20,2) not null, "currency" varchar(3) not null, "reference_external_transaction_id" varchar(255) null, "reference_transaction_id" uuid null, "status" varchar(32) not null default 'PENDING', "failure_code" varchar(255) null, "processed_at" timestamptz null, "created_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "idx_wager_pending_reference" on "wager_transactions" ("status", "created_at");`);
    this.addSql(`alter table "wager_transactions" add constraint "uq_wager_provider_idempotency" unique ("provider_id", "idempotency_key");`);
    this.addSql(`alter table "wager_transactions" add constraint "uq_wager_provider_external" unique ("provider_id", "external_transaction_id");`);

    this.addSql(`create table "wallets" ("id" uuid not null, "player_id" uuid not null, "currency" varchar(3) not null, "balance" numeric(20,2) not null, "version" int not null default 1, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`alter table "wallets" add constraint "uq_wallet_player_currency" unique ("player_id", "currency");`);

    this.addSql(`create table "wallet_ledger_entries" ("id" uuid not null, "wallet_id" uuid not null, "transaction_id" uuid not null, "direction" varchar(6) not null, "amount" numeric(20,2) not null, "currency" varchar(3) not null, "balance_before" numeric(20,2) not null, "balance_after" numeric(20,2) not null, "created_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "idx_ledger_wallet_created_id" on "wallet_ledger_entries" ("wallet_id", "created_at", "id");`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "uq_ledger_transaction" unique ("transaction_id");`);

    this.addSql(`alter table "wallets" add constraint "wallets_player_id_foreign" foreign key ("player_id") references "users" ("id") on delete restrict;`);
  }

}
