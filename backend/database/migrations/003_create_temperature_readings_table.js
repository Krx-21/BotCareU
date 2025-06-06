exports.up = function(knex) {
  return knex.schema.createTable('temperature_readings', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('deviceId').notNullable().references('id').inTable('devices').onDelete('CASCADE');
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('infraredTemp', 4, 2);
    table.decimal('contactTemp', 4, 2);
    table.decimal('ambientTemp', 4, 2);
    table.decimal('temperature', 4, 2).notNullable();
    table.enum('measurementType', ['infrared', 'contact', 'combined']).notNullable();
    table.decimal('accuracy', 3, 2);
    table.boolean('isValid').defaultTo(true);
    table.boolean('feverDetected').defaultTo(false);
    table.enum('feverSeverity', ['none', 'mild', 'moderate', 'high', 'critical']).defaultTo('none');
    table.jsonb('location').defaultTo(JSON.stringify({
      bodyPart: null,
      coordinates: {
        latitude: null,
        longitude: null
      }
    }));
    table.jsonb('metadata').defaultTo(JSON.stringify({
      batteryLevel: null,
      signalStrength: null,
      firmwareVersion: null,
      calibrationOffset: 0,
      measurementDuration: null,
      retryCount: 0
    }));
    table.timestamp('timestamp').notNullable();
    table.timestamps(true, true);

    // Indexes
    table.index('deviceId');
    table.index('userId');
    table.index('timestamp');
    table.index('feverDetected');
    table.index('feverSeverity');
    table.index('isValid');
    table.index('createdAt');
    
    // Composite indexes for common queries
    table.index(['userId', 'timestamp']);
    table.index(['deviceId', 'timestamp']);
    table.index(['userId', 'feverDetected', 'timestamp']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('temperature_readings');
};
