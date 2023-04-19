'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class reaction_role extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  reaction_role.init({
    role_id: DataTypes.STRING,
    reaction: DataTypes.STRING,
    guild_id: DataTypes.STRING,
    message_url: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'reaction_role',
  });
  return reaction_role;
};