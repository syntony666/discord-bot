'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    return Promise.all([
      queryInterface.renameColumn('guilds', 'join_channel_id', 'guild_join_cid'),
      queryInterface.renameColumn('guilds', 'join_message', 'guild_join_msg'),
      queryInterface.renameColumn('guilds', 'leave_channel_id', 'guild_leave_cid'),
      queryInterface.renameColumn('guilds', 'leave_message', 'guild_leave_msg'),
      queryInterface.renameColumn('guilds', 'delete_notification_channel_id', 'message_delete_cid'),

    ])
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    return Promise.all([
      queryInterface.renameColumn('guilds', 'guild_join_cid', 'join_channel_id'),
      queryInterface.renameColumn('guilds', 'guild_join_msg', 'join_message'),
      queryInterface.renameColumn('guilds', 'guild_leave_cid', 'leave_channel_id'),
      queryInterface.renameColumn('guilds', 'guild_leave_msg', 'leave_message'),
      queryInterface.renameColumn('guilds', 'message_delete_cid', 'delete_notification_channel_id'),

    ])
  }
};
