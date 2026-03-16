import "server-only";

import mysql, {
  type Pool,
  type PoolOptions,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

const CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "ETIMEDOUT",
  "PROTOCOL_CONNECTION_LOST",
]);

const DEFAULT_DB_PORT = 3306;

type DbParam =
  | string
  | number
  | bigint
  | boolean
  | Date
  | null
  | Blob
  | Buffer
  | Uint8Array
  | DbParam[]
  | { [key: string]: DbParam };

type DbParams = DbParam[];

let pool: Pool | undefined;

export class DatabaseUnavailableError extends Error {
  public constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DatabaseUnavailableError";
  }
}

function resolveConnectionOptions(): PoolOptions {
  const portValue = process.env.DB_PORT ?? process.env.MYSQL_PORT;
  const parsedPort = Number.parseInt(portValue ?? String(DEFAULT_DB_PORT), 10);

  return {
    host: process.env.DB_HOST ?? process.env.MYSQL_HOST ?? "127.0.0.1",
    port: Number.isNaN(parsedPort) ? DEFAULT_DB_PORT : parsedPort,
    user: process.env.DB_USER ?? process.env.MYSQL_USER ?? "root",
    password:
      process.env.DB_PASSWORD ?? process.env.MYSQL_PASSWORD ?? "localtaskhub",
    database:
      process.env.DB_NAME ?? process.env.MYSQL_DATABASE ?? "local-task-hub",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
  };
}

export function getDbPool(): Pool {
  if (!pool) {
    pool = mysql.createPool(resolveConnectionOptions());
  }

  return pool;
}

function mapDatabaseError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error("Unknown database error");
  }

  const maybeCode = "code" in error ? error.code : undefined;
  if (
    typeof maybeCode === "string" &&
    CONNECTION_ERROR_CODES.has(maybeCode)
  ) {
    return new DatabaseUnavailableError(
      "Unable to connect to local MySQL. Confirm Docker is running and DB settings are correct.",
      { cause: error },
    );
  }

  return error;
}

export async function dbQuery<
  T extends RowDataPacket[] | RowDataPacket[][] | ResultSetHeader,
>(sql: string, params: DbParams = []): Promise<T> {
  try {
    const [result] = await getDbPool().query<T>(sql, params);
    return result;
  } catch (error) {
    throw mapDatabaseError(error);
  }
}

export async function dbExecute(
  sql: string,
  params: DbParams = [],
): Promise<ResultSetHeader> {
  try {
    const [result] = await getDbPool().execute<ResultSetHeader>(sql, params);
    return result;
  } catch (error) {
    throw mapDatabaseError(error);
  }
}

export async function closeDbPool(): Promise<void> {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = undefined;
}
