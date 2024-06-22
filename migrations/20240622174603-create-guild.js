"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("guild", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.STRING,
        unique: true,
      },
      guild_join_cid: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      guild_join_msg: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      guild_leave_cid: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      guild_leave_msg: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      message_delete_cid: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("guild");
  },
};
