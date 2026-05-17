import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAccountNickname1778999376357 implements MigrationInterface {
    name = 'AddAccountNickname1778999376357'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounts" ADD "nickname" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN "nickname"`);
    }

}
