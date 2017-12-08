/* istanbul ignore file */

const config = {
  client: 'postgresql',
  connection: process.env.DATABASE_URL || 'postgres://localhost/bookshelf-geojson'
};

module.exports = {
  development: config,
  test: config
};
