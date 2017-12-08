const knexPostgis = require('knex-postgis');
const wellKnown = require('wellknown');

module.exports = function(db) {

  const st = knexPostgis(db);

  return function(bookshelf) {

    const proto = bookshelf.Model.prototype;

    const protoProps = {};
    enrichRelationsWithGeometry(protoProps, 'belongsTo', 'belongsToMany', 'hasMany', 'hasOne');

    protoProps.initialize = function() {
      proto.initialize.apply(this, arguments);

      const geomProperty = getGeometryProperty(this);
      if (geomProperty) {
        this.query(qb => qb.select(`${this.tableName}.*`, st.asGeoJSON(geomProperty)));
      }
    };

    protoProps.parse = function(response) {
      const parsed = proto.parse.call(this, response);

      const geomProperty = getGeometryProperty(this);
      if (geomProperty && parsed[geomProperty]) {
        parsed[geomProperty] = JSON.parse(parsed[geomProperty]);
      }

      return parsed;
    };

    protoProps.format = function(attributes) {
      const formatted = proto.format.call(this, attributes);

      const geomProperty = getGeometryProperty(this);
      if (geomProperty && formatted[geomProperty]) {
        formatted[geomProperty] = st.geomFromText(wellKnown.stringify(formatted[geomProperty]), 4326);
      }

      return attributes;
    };

    bookshelf.Model = bookshelf.Model.extend(protoProps);

    function getGeometryProperty(record) {
      if (typeof(record.geojson) == 'string') {
        return record.geojson;
      } else if (record.geojson === true) {
        return 'geometry';
      } else if (record.geojson !== undefined) {
        throw new Error(`Model "geojson" property must be a string or boolean, got ${JSON.stringify(record.geojson)} (${typeof(record.geojson)})`)
      }
    }

    function enrichRelationWithGeometry(record, relationType, target, ...args) {
      let relation = proto[relationType].call(record, target, ...args);

      const targetModel = typeof(target) == 'string' ? bookshelf.model(target) : target;
      const targetProto = targetModel.prototype;
      const geomProperty = getGeometryProperty(targetProto);
      if (geomProperty) {
        relation = relation.query(qb => qb.select(`${targetProto.tableName}.*`, st.asGeoJSON(geomProperty)));
      }

      return relation;
    }

    function enrichRelationsWithGeometry(protoProps, ...relations) {
      relations.forEach(relation => {
        protoProps[relation] = function(target, ...args) {
          return enrichRelationWithGeometry(this, relation, target, ...args);
        };
      });
    }
  };
};
