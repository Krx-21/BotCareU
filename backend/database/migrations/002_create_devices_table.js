exports.up = function(knex) {
  return knex.schema.createTable('devices', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('deviceId', 100).unique().notNullable();
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.enum('status', ['online', 'offline', 'error', 'maintenance']).defaultTo('offline');
    table.integer('batteryLevel').checkBetween([0, 100]);
    table.integer('signalStrength').checkBetween([-100, 0]);
    table.string('firmwareVersion');
    table.timestamp('lastSeen');
    table.jsonb('location').defaultTo(JSON.stringify({
      name: null,
      latitude: null,
      longitude: null
    }));
    table.jsonb('settings').defaultTo(JSON.stringify({
      measurementInterval: 60000,
      feverThreshold: 37.5,
      alertsEnabled: true,
      autoMeasurement: true,
      displayBrightness: 80,
      soundEnabled: true
    }));
    table.jsonb('calibration').defaultTo(JSON.stringify({
      infraredOffset: 0,
      contactOffset: 0,
      lastCalibrated: null
    }));
    table.boolean('isActive').defaultTo(true);
    table.timestamps(true, true);

    // Indexes
    table.index('deviceId');
    table.index('userId');
    table.index('status');
    table.index('isActive');
    table.index('lastSeen');
    table.index('createdAt');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('devices');
};
