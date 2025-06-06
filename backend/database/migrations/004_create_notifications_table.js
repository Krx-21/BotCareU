exports.up = function(knex) {
  return knex.schema.createTable('notifications', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', [
      'fever_alert',
      'device_offline',
      'low_battery',
      'system_alert',
      'reminder',
      'emergency',
      'info'
    ]).notNullable();
    table.string('title', 200).notNullable();
    table.text('message').notNullable();
    table.enum('priority', ['low', 'normal', 'high', 'critical']).defaultTo('normal');
    table.jsonb('data').defaultTo('{}');
    table.jsonb('channels').defaultTo(JSON.stringify(['push', 'websocket']));
    table.jsonb('deliveryStatus').defaultTo('{}');
    table.boolean('isRead').defaultTo(false);
    table.timestamp('readAt');
    table.boolean('isArchived').defaultTo(false);
    table.timestamp('archivedAt');
    table.integer('retryCount').defaultTo(0);
    table.integer('maxRetries').defaultTo(3);
    table.timestamps(true, true);

    // Indexes
    table.index('userId');
    table.index('type');
    table.index('priority');
    table.index('isRead');
    table.index('isArchived');
    table.index('createdAt');
    
    // Composite indexes for common queries
    table.index(['userId', 'isRead', 'isArchived']);
    table.index(['userId', 'type', 'createdAt']);
    table.index(['priority', 'createdAt']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('notifications');
};
