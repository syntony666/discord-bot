require("dotenv").config();
module.exports = {
  development: {
    username: process.env.MARIADB_USER,
    password: process.env.MARIADB_ROOT_PASSWORD,
    database: process.env.MARIADB_DATABASE + "_development",
    host: process.env.DATABASE_HOST,
    dialect: "mysql",
  },
  test: {
    username: process.env.MARIADB_USER,
    password: process.env.MARIADB_ROOT_PASSWORD,
    database: process.env.MARIADB_DATABASE + "_test",
    host: process.env.DATABASE_HOST,
    dialect: "mysql",
  },
  production: {
    username: process.env.MARIADB_USER,
    password: process.env.MARIADB_ROOT_PASSWORD,
    database: process.env.MARIADB_DATABASE,
    host: process.env.DATABASE_HOST,
    dialect: "mysql",
  },
};
