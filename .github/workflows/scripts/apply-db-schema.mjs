import { readFile } from "node:fs/promises";

import mysql from "mysql2/promise";

const schema = await readFile(".docker/db_schema.sql", "utf8");

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

try {
  await connection.query(schema);
} finally {
  await connection.end();
}
