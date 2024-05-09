import { MigrationInterface, QueryRunner } from "typeorm";

export class AddShippingOptionStoreId1715166834834 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "shipping_option" ADD "store_id" character varying`)
        await queryRunner.query(`CREATE INDEX "ShippingOptionStoreId" ON "shipping_option" ("store_id")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."ShippingOptionStoreId"`)
        await queryRunner.query(`ALTER TABLE "shipping_option" DROP COLUMN "store_id"`)
    }

}
