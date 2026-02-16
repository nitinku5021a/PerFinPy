const path = require("path");
const { DataSource } = require("typeorm");

const dbPath = process.env.DB_PATH || path.resolve(__dirname, "..", "..", "..", "accounting.db");

const AppDataSource = new DataSource({
  type: "sqlite",
  database: dbPath,
  entities: [],
  synchronize: false,
  logging: false
});

module.exports = { AppDataSource, dbPath };
