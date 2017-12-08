# bookshelf-geojson

This [Bookshelf.js](http://bookshelfjs.org) plugin automatically parses and formats PostGIS geometry columns as GeoJSON in your models.

[![npm version](https://badge.fury.io/js/bookshelf-geojson.svg)](https://badge.fury.io/js/bookshelf-geojson)
[![Dependency Status](https://gemnasium.com/badges/github.com/MediaComem/bookshelf-geojson.svg)](https://gemnasium.com/github.com/MediaComem/bookshelf-geojson)
[![Build Status](https://travis-ci.org/MediaComem/bookshelf-geojson.svg?branch=master)](https://travis-ci.org/MediaComem/bookshelf-geojson)
[![Coverage Status](https://coveralls.io/repos/github/MediaComem/bookshelf-geojson/badge.svg?branch=master)](https://coveralls.io/github/MediaComem/bookshelf-geojson?branch=master)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.txt)

Developed at the [Media Engineering Institute](http://mei.heig-vd.ch) ([HEIG-VD](https://heig-vd.ch)).



## Usage

```js
const bookshelf = require('bookshelf');
const bookshelfGeojson = require('bookshelf-geojson');
const knex = require('knex');

const db = knex({
  client: 'postgresql',
  connection: 'postgres://localhost/bookshelf-geojson'
});

const Bookshelf = bookshelf(knex);
Bookshelf.plugin(bookshelfGeojson(db));

const Address = Bookshelf.Model.extend({
  tableName: 'addresses',

  // Indicate the column containing a PostGIS geometry type.
  geojson: 'location'
});

const geojson = {
  type: 'Point',
  coordinates: [ 24, 42 ]
};

// The GeoJSON is automatically serialized for PostGIS.
const address = new Address();
address.set('location', geojson);
address.save();

// The GeoJSON is automatically parsed with PostGIS's ST_AsGeoJSON function.
const anotherAddress = new Address({ id: 1 }).fetch();
console.log(anotherAddress.get('location'));
// { id: 1, location: { type: 'Point', coordinates: [ 33, 66 ] } }
```
