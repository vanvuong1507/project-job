import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Initial schema (spec §1.1): admin_users, daily_metrics, event_impacts. */

export class InitSchema1792135603519 implements MigrationInterface {
  name = 'InitSchema1792135603519';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "admin_users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying(254) NOT NULL, "password_hash" character varying(255) NOT NULL, "name" character varying(120) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_dcd0c8a4b10af9c986e510b9ecc" UNIQUE ("email"), CONSTRAINT "PK_06744d221bb6145dc61e5dc441d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."event_impact_type" AS ENUM('POSITIVE', 'NEGATIVE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "event_impacts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "date" date NOT NULL, "impact" "public"."event_impact_type" NOT NULL, "title" character varying(120) NOT NULL, "description" character varying(500), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_event_impacts_title_not_blank" CHECK (length(btrim("title")) > 0), CONSTRAINT "PK_9a724f3320514ee621b09fd6932" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_event_impacts_date" ON "event_impacts"  ("date") `);
    await queryRunner.query(
      `CREATE TABLE "daily_metrics" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "date" date NOT NULL, "pos_revenue" numeric(12,2) NOT NULL DEFAULT '0', "eatclub_revenue" numeric(12,2) NOT NULL DEFAULT '0', "labour_cost" numeric(12,2) NOT NULL DEFAULT '0', "covers" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_c3014622c8afe6395973b399e68" UNIQUE ("date"), CONSTRAINT "CHK_daily_metrics_covers" CHECK ("covers" >= 0), CONSTRAINT "CHK_daily_metrics_labour_cost" CHECK ("labour_cost" >= 0), CONSTRAINT "CHK_daily_metrics_eatclub_revenue" CHECK ("eatclub_revenue" >= 0), CONSTRAINT "CHK_daily_metrics_pos_revenue" CHECK ("pos_revenue" >= 0), CONSTRAINT "PK_0b33a3faffa5fbb3d4dad78c4e9" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "daily_metrics"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_event_impacts_date"`);
    await queryRunner.query(`DROP TABLE "event_impacts"`);
    await queryRunner.query(`DROP TYPE "public"."event_impact_type"`);
    await queryRunner.query(`DROP TABLE "admin_users"`);
  }
}
