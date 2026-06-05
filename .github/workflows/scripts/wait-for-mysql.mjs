import mysql from "mysql2/promise";

const config = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

const maxAttempts = 30;

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    const connection = await mysql.createConnection(config);
    await connection.ping();
    await connection.end();
    process.exit(0);
  } catch (error) {
    if (attempt === maxAttempts) {
      console.error("MySQL did not become ready in time.");
      console.error(error);
      process.exit(1);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
