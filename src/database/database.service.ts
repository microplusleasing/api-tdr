import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import oracledb, { Connection, Pool, PoolAttributes, Result } from 'oracledb';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  private pool!: Pool;

  /**
   * Max time (ms) a single DB call may run before Oracle aborts it.
   * Prevents one hung query from holding a pooled connection forever.
   */
  private readonly callTimeoutMs = 20000;

  constructor(private readonly configService: ConfigService) {}

  /** callTimeout needs Oracle Client 18.1+ (version 1801000000). */
  private supportsCallTimeout = false;

  async onModuleInit(): Promise<void> {
    oracledb.initOracleClient();

    this.supportsCallTimeout = oracledb.oracleClientVersion >= 1801000000;

    this.logger.log(
      `Oracle Client version: ${oracledb.oracleClientVersionString} ` +
        `(callTimeout ${this.supportsCallTimeout ? 'enabled' : 'disabled'})`,
    );

    await this.createPool();
  }

  async onModuleDestroy(): Promise<void> {
    await this.closePool();
  }

  // ============================================================
  // Pool
  // ============================================================

  private async createPool(): Promise<void> {
    const user = this.configService.get<string>('ORACLE_USER');

    const password = this.configService.get<string>('ORACLE_PASSWORD');

    const connectString = this.configService.get<string>(
      'ORACLE_CONNECT_STRING',
    );

    const poolMax = Number(
      this.configService.get<string>('ORACLE_POOL_MAX') ?? 10,
    );

    if (!user) {
      throw new Error('ORACLE_USER is not configured');
    }

    if (!password) {
      throw new Error('ORACLE_PASSWORD is not configured');
    }

    if (!connectString) {
      throw new Error('ORACLE_CONNECT_STRING is not configured');
    }

    const config: PoolAttributes = {
      user,
      password,
      connectString,

      // Fixed-size pool: all connections are opened at startup,
      // so a burst of requests never waits on slow connection creation.
      poolMin: poolMax,
      poolMax,
      poolIncrement: 0,

      // Fixed pool -> never close idle connections.
      poolTimeout: 0,

      // Check an idle connection is still alive before handing it out
      // (handles connections silently dropped by firewall / VPN / DB).
      poolPingInterval: 30,

      // Max wait (ms) for a free connection -> NJS-040 if exceeded.
      queueTimeout: 30000,
    };

    this.logger.log(
      `Creating Oracle pool: ${connectString} (poolMax=${poolMax})`,
    );

    this.pool = await oracledb.createPool(config);

    this.logger.log('Oracle connection pool created');
  }

  private async getConnection(): Promise<Connection> {
    if (!this.pool) {
      throw new Error('Oracle connection pool is not initialized');
    }

    try {
      const connection = await this.pool.getConnection();

      // Abort any single call that runs longer than the limit.
      // Only supported by Oracle Client 18.1+; skipped on older clients.
      if (this.supportsCallTimeout) {
        try {
          connection.callTimeout = this.callTimeoutMs;
        } catch (error) {
          // Never leak the connection if setup fails.
          await this.safeClose(connection);

          throw error;
        }
      }

      return connection;
    } catch (error) {
      // Helps confirm whether the pool is exhausted when NJS-040 happens.
      this.logger.error(
        `Failed to get Oracle connection ` +
          `(open=${this.pool.connectionsOpen}, ` +
          `inUse=${this.pool.connectionsInUse}): ` +
          `${(error as Error).message}`,
      );

      throw error;
    }
  }

  // ============================================================
  // Single connection scope
  // ============================================================

  /**
   * Borrow ONE connection, run the callback, always release it.
   * Use this when you need several queries in one request
   * (instead of calling query() many times).
   */
  async withConnection<T>(
    callback: (connection: Connection) => Promise<T>,
  ): Promise<T> {
    const connection = await this.getConnection();

    try {
      return await callback(connection);
    } finally {
      await this.safeClose(connection);
    }
  }

  // ============================================================
  // Query helpers
  // ============================================================

  async query<T = any>(
    sql: string,
    binds: Record<string, unknown> = {},
    options: oracledb.ExecuteOptions = {},
  ): Promise<Result<T>> {
    return this.withConnection((connection) =>
      this.executeOnConnection<T>(connection, sql, binds, options),
    );
  }

  async execute<T = any>(
    sql: string,
    binds: Record<string, unknown> = {},
    options: oracledb.ExecuteOptions = {},
  ): Promise<Result<T>> {
    return this.query<T>(sql, binds, options);
  }

  async executeOnConnection<T = any>(
    connection: Connection,
    sql: string,
    binds: Record<string, unknown> = {},
    options: oracledb.ExecuteOptions = {},
  ): Promise<Result<T>> {
    return connection.execute<T>(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      ...options,
    });
  }

  // ============================================================
  // Transaction
  // ============================================================

  async transaction<T>(
    callback: (connection: Connection) => Promise<T>,
  ): Promise<T> {
    const connection = await this.getConnection();

    try {
      const result = await callback(connection);

      await connection.commit();

      return result;
    } catch (error) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        // Do not hide the original error with a rollback failure.
        this.logger.error(
          `Rollback failed: ${(rollbackError as Error).message}`,
        );
      }

      throw error;
    } finally {
      await this.safeClose(connection);
    }
  }

  // ============================================================
  // Close
  // ============================================================

  private async safeClose(connection: Connection): Promise<void> {
    try {
      await connection.close();
    } catch (error) {
      this.logger.error(
        `Failed to release Oracle connection: ${(error as Error).message}`,
      );
    }
  }

  async closePool(): Promise<void> {
    if (this.pool) {
      await this.pool.close(10);

      this.logger.log('Oracle connection pool closed');
    }
  }
}
