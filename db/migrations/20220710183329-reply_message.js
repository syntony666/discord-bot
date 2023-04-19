'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reply_messages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      request: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      response: {
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
        onDelete: 'cascade',
        onUpdate: 'cascade'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    }).then(() => {
      return queryInterface.addConstraint('reply_messages',{
        fields: ['request', 'guild_id'],
        type: 'unique',
        name: 'replyMessageIndex'
      });
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('reply_messages');
  }
};