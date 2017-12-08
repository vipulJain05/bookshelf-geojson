exports.up = async function(knex) {

  await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis');

  await knex.schema.createTable('points', t => {
    t.bigIncrements().primary();
    t.specificType('geometry', 'geometry(POINT, 4326)');
  });

  await knex.schema.createTable('tweets', t => {
    t.bigIncrements().primary();
    t.specificType('location', 'geometry(POINT, 4326)');
  });

  await knex.schema.createTable('addresses', t => {
    t.bigIncrements().primary();

    t.bigInteger('point_id')
      .notNullable()
      .references('points.id')
      .onUpdate('cascade')
      .onDelete('cascade');
  });

  await knex.schema.createTable('paths', t => {
    t.bigIncrements().primary();
  });

  await knex.schema.createTable('paths_points', t => {

    t.bigInteger('path_id')
      .notNullable()
      .references('paths.id')
      .onUpdate('cascade')
      .onDelete('cascade');

    t.bigInteger('point_id')
      .notNullable()
      .references('points.id')
      .onUpdate('cascade')
      .onDelete('cascade');

    t.unique([ 'path_id', 'point_id' ]);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('addresses');
  await knex.schema.dropTable('paths_points');
  await knex.schema.dropTable('paths');
  await knex.schema.dropTable('points');
  await knex.schema.dropTable('tweets');
};
