import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import oracledb, {
    Connection,
    Pool,
    PoolAttributes,
    Result,
} from 'oracledb';

@Injectable()
export class DatabaseService
    implements OnModuleInit, OnModuleDestroy {

    private readonly logger = new Logger(DatabaseService.name);

    private pool!: Pool;

    constructor(
        private readonly configService: ConfigService,
    ) { }

    async onModuleInit(): Promise<void> {
        oracledb.initOracleClient();
        await this.createPool();
    }

    async onModuleDestroy(): Promise<void> {
        await this.closePool();
    }

    private async createPool(): Promise<void> {

        const user = this.configService.get<string>(
            'ORACLE_USER',
        );

        const password = this.configService.get<string>(
            'ORACLE_PASSWORD',
        );

        const connectString = this.configService.get<string>(
            'ORACLE_CONNECT_STRING',
        );

        const poolMin = Number(
            this.configService.get<string>('ORACLE_POOL_MIN') ?? 2,
        );

        const poolMax = Number(
            this.configService.get<string>('ORACLE_POOL_MAX') ?? 10,
        );

        const poolIncrement = Number(
            this.configService.get<string>('ORACLE_POOL_INCREMENT') ?? 1,
        );

        if (!user) {
            throw new Error(
                'ORACLE_USER is not configured',
            );
        }

        if (!password) {
            throw new Error(
                'ORACLE_PASSWORD is not configured',
            );
        }

        if (!connectString) {
            throw new Error(
                'ORACLE_CONNECT_STRING is not configured',
            );
        }

        const config: PoolAttributes = {
            user,
            password,
            connectString,

            poolMin,
            poolMax,
            poolIncrement,

            poolTimeout: 60,
            queueTimeout: 30000,
        };

        this.logger.log(
            `Creating Oracle pool: ${connectString}`,
        );

        this.pool = await oracledb.createPool(config);

        this.logger.log(
            'Oracle connection pool created',
        );
    }

    private async getConnection(): Promise<Connection> {

        if (!this.pool) {
            throw new Error(
                'Oracle connection pool is not initialized',
            );
        }

        return this.pool.getConnection();
    }

    async query<T = any>(
        sql: string,
        binds: Record<string, unknown> = {},
        options: oracledb.ExecuteOptions = {},
    ): Promise<Result<T>> {

        let connection: Connection | undefined;

        try {

            connection = await this.getConnection();

            return await connection.execute<T>(
                sql,
                binds,
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                    ...options,
                },
            );

        } finally {

            if (connection) {
                await connection.close();
            }
        }
    }

    async execute<T = any>(
        sql: string,
        binds: Record<string, unknown> = {},
        options: oracledb.ExecuteOptions = {},
    ): Promise<Result<T>> {

        return this.query<T>(
            sql,
            binds,
            options,
        );
    }

    async transaction<T>(
        callback: (connection: Connection) => Promise<T>,
    ): Promise<T> {

        let connection: Connection | undefined;

        try {

            connection = await this.getConnection();

            const result = await callback(connection);

            await connection.commit();

            return result;

        } catch (error) {

            if (connection) {
                await connection.rollback();
            }

            throw error;

        } finally {

            if (connection) {
                await connection.close();
            }
        }
    }

    async closePool(): Promise<void> {

        if (this.pool) {
            await this.pool.close(10);

            this.logger.log(
                'Oracle connection pool closed',
            );
        }
    }
}