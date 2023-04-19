'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class reply_message extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  reply_message.init({
    guild_id: {type: DataTypes.STRING},
    request: {type:DataTypes.STRING},
    response: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'reply_message',
  });
  return reply_message;
};