"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface
      .createTable("message_reply", {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        request: {
          allowNull: false,
          type: Sequelize.STRING,
        },
        response: {
          allowNull: false,
          type: Sequelize.STRING,
        },
        guild_id: {
          allowNull: false,
          type: Sequelize.STRING,
          references: {
            model: "guild",
            key: "id",
          },
          onDelete: "cascade",
          onUpdate: "cascade",
        },
        last_editor_id: {
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
      })
      .then(() => {
        return queryInterface.addConstraint("message_reply", {
          fields: ["request", "guild_id"],
          type: "unique",
          name: "replyMessageIndex",
        });
      });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("message_reply");
  },
};
