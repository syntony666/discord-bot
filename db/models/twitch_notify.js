'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class twitch_notify extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  twitch_notify.init({
    guild_id: DataTypes.STRING,
    channel_id: DataTypes.STRING,
    twitch_id: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'twitch_notify',
  });
  return twitch_notify;
};