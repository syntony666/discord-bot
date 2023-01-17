import { Client, TextChannel } from 'discord.js';
import { TwitchNotifyModel } from '../database/twitchNotifyModel';
import { TwitchStatusModel } from '../database/twitchStatusModel';
import { DBConnectionService } from '../service/DBConnectionService';
import { TwitchConnectionService } from '../service/twitchConnectionService';
import _ from 'lodash';
import { Model } from 'sequelize/types';

export abstract class IntervalActionHelper {
  public static twitchNotifyInterval = (client: Client) =>
    setInterval(() => {
      let notifyData: Model<any, any>[];
      let statusData: Model<any, any>[];
      let twitchData: {
        twitch_id: string;
        profile_image_url: string;
        is_streaming: boolean;
        title: string;
        game_name: string;
      }[];

      const promiseDBList = [];
      promiseDBList.push(DBConnectionService(TwitchNotifyModel).findAll());
      promiseDBList.push(DBConnectionService(TwitchStatusModel).findAll());
      Promise.all(promiseDBList)
        .then((result) => {
          notifyData = result[0];
          statusData = result[1];

          const promiseTwitchList = [];
          const twitchConnectionService = new TwitchConnectionService();
          promiseTwitchList.push(
            twitchConnectionService.getStreamStatus(statusData.map((data: any) => data.twitch_id))
          );
          promiseTwitchList.push(twitchConnectionService.getUserInfo(statusData.map((data: any) => data.twitch_id)));
          return Promise.all(promiseTwitchList);
        })
        .then((result) => {
          let postData: {}[] = [];

          twitchData = _.toArray(_.merge(_.keyBy(result[0], 'twitch_id'), _.keyBy(result[1], 'twitch_id'))).map(
            (data: any) => ({
              twitch_id: data.twitch_id ?? '',
              profile_image_url: data.profile_image_url ?? '',
              is_streaming: data.is_streaming ? true : false,
              title: data.title ?? '',
              game_name: data.game_name ?? '',
            })
          );
          console.log(twitchData);
          const updatedStatus = statusData.filter((status: any) =>
            twitchData.some(
              (resData: any) => resData.is_streaming !== status.is_streaming && resData.twitch_id === status.twitch_id
            )
          );
          updatedStatus.forEach((dtoData) => {
            const targetData = twitchData.find((data) => data.twitch_id === (dtoData as any).twitch_id);
            if (!targetData) {
              return;
            }
            dtoData.update(targetData);
            if (targetData.is_streaming) {
              postData.push(...notifyData.filter((notify: any) => notify.twitch_id === targetData?.twitch_id));
            }
          });
          return postData;
        })
        .then((postData) => {
          console.log(postData);
          postData.forEach((post: any) => {
            const postMessage = post.message ? post.message + '\n' : '';
            client.channels
              .fetch(post.channel_id)
              .then((channel) => (channel as TextChannel).send(`${postMessage}https://twitch.tv/${post.twitch_id}`));
          });
        })
        .catch((err) => console.log(err));
    }, 10000);
}
