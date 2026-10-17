import type { MigrationInterface, QueryRunner } from 'typeorm';

/** RBAC (frontend production-architecture AC-6): admin_users.role, existing users become ADMIN. */

export class AddAdminRole1792136152466 implements MigrationInterface {
  name = 'AddAdminRole1792136152466';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."admin_role" AS ENUM('ADMIN', 'VIEWER')`);
    await queryRunner.query(
      `ALTER TABLE "admin_users" ADD "role" "public"."admin_role" NOT NULL DEFAULT 'ADMIN'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "admin_users" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE "public"."admin_role"`);
  }
}
