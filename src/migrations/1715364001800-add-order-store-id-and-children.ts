import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderStoreIdAndChildren1715364001800 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order" ADD "store_id" character varying`)
        await queryRunner.query(`CREATE INDEX "OrderStoreId" ON "order" ("store_id")`)

        await queryRunner.query(`ALTER TABLE "order" ADD "order_parent_id" character varying`)
        await queryRunner.query(`CREATE INDEX "OrderParentId" ON "order" ("order_parent_id")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."OrderParentId"`)
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "order_parent_id"`)

        await queryRunner.query(`DROP INDEX "public"."OrderStoreId"`)
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "store_id"`)
    }

}
