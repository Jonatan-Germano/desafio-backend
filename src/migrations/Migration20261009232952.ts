import { Migration } from '@mikro-orm/migrations';

export class Migration20261009232952 extends Migration {

  override name = 'Migration20261009232952';

  override up(): void | Promise<void> {
    this.addSql(`alter table "wager_transactions" add "resulting_balance" numeric(20,2) null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "wager_transactions" drop column "resulting_balance";`);
  }

}
