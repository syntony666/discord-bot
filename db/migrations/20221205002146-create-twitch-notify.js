'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface
      .createTable('twitch_notifies', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        guild_id: {
          allowNull: false,
          type: Sequelize.STRING,
          references: {
            model: 'guilds',
            key: 'guild_id',
          },
          onDelete: 'cascade',
        },
        channel_id: {
          type: Sequelize.STRING,
        },
        twitch_id: {
          allowNull: false,
          type: Sequelize.STRING,
          references: {
            model: 'twitch_statuses',
            key: 'twitch_id',
          },
          onDelete: 'cascade',
        },
        message: {
          type: Sequelize.STRING,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      })
      .then(() => {
        return queryInterface.addConstraint('twitch_notifies', {
          fields: ['guild_id', 'twitch_id'],
          type: 'unique',
          name: 'twitchNotifyIndex',
        });
      });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('twitch_notifies');
  }
};