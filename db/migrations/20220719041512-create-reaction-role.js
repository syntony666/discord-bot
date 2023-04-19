'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reaction_roles', {
      role_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.STRING
      },
      reaction: {
        allowNull: false,
        type: Sequelize.STRING
      },
      guild_id: {
        allowNull: false,
        type: Sequelize.STRING,
        references: {
          model: 'guilds',
          key: 'guild_id'
        },
        onDelete: 'cascade'
      },
      message_url: {
        allowNull: false,
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('reaction_roles');
  }
};