'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class twitch_status extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  twitch_status.init({
    id: DataTypes.STRING,
    is_streaming: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'twitch_status',
  });
  return twitch_status;
};