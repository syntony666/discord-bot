'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    return Promise.all([
      queryInterface.addColumn('guilds', 'join_channel_id', {
        type: Sequelize.STRING,
        allowNull: true
      }),
      queryInterface.addColumn('guilds', 'join_message', {
        type: Sequelize.STRING,
        allowNull: true
      }),
      queryInterface.addColumn('guilds', 'leave_channel_id', {
        type: Sequelize.STRING,
        allowNull: true
      }),
      queryInterface.addColumn('guilds', 'leave_message', {
        type: Sequelize.STRING,
        allowNull: true
      })
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
      queryInterface.removeColumn('guilds', 'join_channel_id'),
      queryInterface.removeColumn('guilds', 'join_message'),
      queryInterface.removeColumn('guilds', 'leave_channel_id'),
      queryInterface.removeColumn('guilds', 'leave_message')
    ])
  }
};
