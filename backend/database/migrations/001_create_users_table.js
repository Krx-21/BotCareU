exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').unique().notNullable();
    table.string('password').notNullable();
    table.string('firstName', 50).notNullable();
    table.string('lastName', 50).notNullable();
    table.date('dateOfBirth');
    table.enum('gender', ['male', 'female', 'other', 'prefer_not_to_say']);
    table.enum('role', ['patient', 'healthcare_provider', 'admin']).defaultTo('patient');
    table.boolean('isActive').defaultTo(true);
    table.boolean('isEmailVerified').defaultTo(false);
    table.jsonb('preferences').defaultTo(JSON.stringify({
      temperatureUnit: 'celsius',
      feverThreshold: 37.5,
      notificationsEnabled: true,
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true
    }));
    table.timestamp('lastLoginAt');
    table.timestamps(true, true);

    // Indexes
    table.index('email');
    table.index('role');
    table.index('isActive');
    table.index('createdAt');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};
