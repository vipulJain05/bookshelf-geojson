const Bookshelf = require('bookshelf');
const { expect } = require('chai');
const debug = require('debug')('bookshelf-geojson');
const knex = require('knex');
const knexPostgis = require('knex-postgis');
const _ = require('lodash');
const wellKnown = require('wellknown');

const bookshelfGeometry = require('../');
const knexConfig = require('../knexfile').test;

const db = knex(knexConfig);
const st = knexPostgis(db);

db.on('query', query => {
  debug(query.sql);
});

after(() => {
  return db.destroy();
});

describe('bookshelf-geojson', () => {

  let bookshelf;
  beforeEach(async () => {
    bookshelf = initBookShelf(db);
    await db.delete().from('addresses');
    await db.delete().from('paths');
    await db.delete().from('points');
    await db.delete().from('tweets');
  });

  it('should not do anything on a model without a "geojson" option', async () => {

    const Model = bookshelf.Model.extend({
      tableName: 'paths'
    });

    const record = await new Model().save();
    const sameRecord = await new Model({ id: record.id }).fetch();
    expect(record.id).to.equal(sameRecord.id);
  });

  it('should not accept an invalid "geojson" option', () => {

    const Model = bookshelf.Model.extend({
      tableName: 'points',
      geojson: 66
    });

    expect(() => new Model()).to.throw('Model "geojson" property must be a string or boolean, got 66 (number)');
  });

  it('should format GeoJSON', async () => {

    const Model = bookshelf.Model.extend({
      tableName: 'points',
      geojson: true
    });

    const point = {
      type: 'Point',
      coordinates: [ 24, 42 ]
    };

    const record = new Model();
    record.set('geometry', point);

    await record.save();

    expect(record.get('geometry')).to.eql(point);

    const rows = await db.select('*', st.asGeoJSON('geometry')).from('points').where('id', record.id);
    expect(rows).to.have.lengthOf(1);
    expect(JSON.parse(rows[0].geometry)).to.eql(point);
  });

  it('should format GeoJSON in a custom column', async () => {

    const Model = bookshelf.Model.extend({
      tableName: 'tweets',
      geojson: 'location'
    });

    const point = {
      type: 'Point',
      coordinates: [ 24, 42 ]
    };

    const record = new Model();
    record.set('location', point);

    await record.save();

    expect(record.get('location')).to.eql(point);

    const rows = await db.select('*', st.asGeoJSON('location')).from('tweets').where('id', record.id);
    expect(rows).to.have.lengthOf(1);
    expect(JSON.parse(rows[0].location)).to.eql(point);
  });

  it('should parse GeoJSON', async () => {

    const point = {
      type: 'Point',
      coordinates: [ 24, 42 ]
    };

    await db.insert({ id: 1, geometry: st.geomFromText(wellKnown.stringify(point), 4326) }).into('points');

    const Model = bookshelf.Model.extend({
      tableName: 'points',
      geojson: true
    });

    const record = await new Model({ id: 1 }).fetch();
    expect(record).to.be.ok;
    expect(record.get('geometry')).to.eql(point);
  });

  it('should parse GeoJSON in a custom column', async () => {

    const point = {
      type: 'Point',
      coordinates: [ 24, 42 ]
    };

    await db.insert({ id: 1, location: st.geomFromText(wellKnown.stringify(point), 4326) }).into('tweets');

    const Model = bookshelf.Model.extend({
      tableName: 'tweets',
      geojson: 'location'
    });

    const record = await new Model({ id: 1 }).fetch();
    expect(record).to.be.ok;
    expect(record.get('location')).to.eql(point);
  });

  it('should parse GeoJSON in a related model from a belongsTo relationship', async () => {

    const geometry = {
      type: 'Point',
      coordinates: [ 24, 42 ]
    };

    const pointInsertResult = await db.insert({ geometry: st.geomFromText(wellKnown.stringify(geometry), 4326) }).into('points').returning('id');
    const pointId = pointInsertResult[0];

    const addressInsertResult = await db.insert({ point_id: pointId }).into('addresses').returning('id');
    const addressId = addressInsertResult[0];

    const Point = bookshelf.Model.extend({
      tableName: 'points',
      geojson: true
    });

    const Address = bookshelf.Model.extend({
      tableName: 'addresses',

      point: function() {
        return this.belongsTo(Point);
      }
    });

    const address = await new Address({ id: addressId }).fetch();
    expect(address).to.be.ok;
    expect(address.get('point_id')).to.equal(pointId);

    const point = await address.point().fetch();
    expect(point).to.be.ok;
    expect(point.get('geometry')).to.eql(geometry);
  });

  it('should parse GeoJSON in an eager-loaded model from a belongsTo relationship', async () => {

    const geometry = {
      type: 'Point',
      coordinates: [ 24, 42 ]
    };

    const pointInsertResult = await db.insert({ geometry: st.geomFromText(wellKnown.stringify(geometry), 4326) }).into('points').returning('id');
    const pointId = pointInsertResult[0];

    const addressInsertResult = await db.insert({ point_id: pointId }).into('addresses').returning('id');
    const addressId = addressInsertResult[0];

    const Point = bookshelf.Model.extend({
      tableName: 'points',
      geojson: true
    });

    const Address = bookshelf.Model.extend({
      tableName: 'addresses',

      point: function() {
        return this.belongsTo(Point);
      }
    });

    const address = await new Address({ id: addressId }).fetch({ withRelated: 'point' });
    expect(address).to.be.ok;
    expect(address.get('point_id')).to.equal(pointId);
    expect(address.related('point')).to.be.ok;
    expect(address.related('point').get('geometry')).to.eql(geometry);
  });

  it('should parse GeoJSON in a related model from a belongsToMany relationship', async () => {

    const geometry = {
      type: 'Point',
      coordinates: [ 24, 42 ]
    };

    const pointInsertResult = await db.insert({ geometry: st.geomFromText(wellKnown.stringify(geometry), 4326) }).into('points').returning('id');
    const pointId = pointInsertResult[0];

    const pathInsertResult = await db.insert({}).into('paths').returning('id');
    const pathId = pathInsertResult[0];

    await db.insert({ path_id: pathId, point_id: pointId }).into('paths_points');

    const Point = bookshelf.Model.extend({
      tableName: 'points',
      geojson: true
    });

    const Path = bookshelf.Model.extend({
      tableName: 'paths',

      points: function() {
        return this.belongsToMany(Point);
      }
    });

    const path = await new Path({ id: pathId }).fetch();
    expect(path).to.be.ok;

    const points = await path.points().fetch();
    expect(points).to.be.ok;
    expect(points).to.have.lengthOf(1);
    expect(points.get(pointId)).to.be.ok;
    expect(points.get(pointId).get('geometry')).to.eql(geometry);
  });

  it('should parse GeoJSON in an eager-loaded model from a belongsToMany relationship', async () => {

    const geometry = {
      type: 'Point',
      coordinates: [ 24, 42 ]
    };

    const pointInsertResult = await db.insert({ geometry: st.geomFromText(wellKnown.stringify(geometry), 4326) }).into('points').returning('id');
    const pointId = pointInsertResult[0];

    const pathInsertResult = await db.insert({}).into('paths').returning('id');
    const pathId = pathInsertResult[0];

    await db.insert({ path_id: pathId, point_id: pointId }).into('paths_points');

    const Point = bookshelf.Model.extend({
      tableName: 'points',
      geojson: true
    });

    const Path = bookshelf.Model.extend({
      tableName: 'paths',

      points: function() {
        return this.belongsToMany(Point);
      }
    });

    const path = await new Path({ id: pathId }).fetch({ withRelated: 'points' });
    expect(path).to.be.ok;

    const points = path.related('points');
    expect(points).to.be.ok;
    expect(points).to.have.lengthOf(1);
    expect(points.get(pointId)).to.be.ok;
    expect(points.get(pointId).get('geometry')).to.eql(geometry);
  });
});

function initBookShelf() {
  const bookshelf = Bookshelf(db);
  bookshelf.plugin('registry');
  bookshelf.plugin(bookshelfGeometry(db));
  return bookshelf;
}
