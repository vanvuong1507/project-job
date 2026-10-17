import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Refresh-token sessions (rotation + reuse detection): one row per sign-in, see AuthSessionEntity. */
export class AddAuthSessions1792167355713 implements MigrationInterface {
  name = 'AddAuthSessions1792167355713';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "auth_sessions" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "user_id" uuid NOT NULL,
                "generation" integer NOT NULL DEFAULT '0',
                "rotated_at" TIMESTAMP WITH TIME ZONE,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "absolute_expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "revoked_at" TIMESTAMP WITH TIME ZONE,
                "revoked_reason" character varying(16),
                "last_ip" character varying(64),
                "user_agent" character varying(255),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "CHK_auth_sessions_revoked_reason" CHECK (
                    "revoked_reason" IS NULL
                    OR "revoked_reason" IN ('logout', 'reuse', 'expired')
                ),
                CONSTRAINT "CHK_auth_sessions_generation" CHECK ("generation" >= 0),
                CONSTRAINT "PK_641507381f32580e8479efc36cd" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_auth_sessions_user_id" ON "auth_sessions" ("user_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "auth_sessions"
            ADD CONSTRAINT "FK_auth_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_auth_sessions_user_id"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_auth_sessions_user_id"
        `);
    await queryRunner.query(`
            DROP TABLE "auth_sessions"
        `);
  }
}
