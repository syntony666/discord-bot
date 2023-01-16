import { Client, TextChannel } from 'discord.js';
import { TwitchNotifyModel } from '../database/twitchNotifyModel';
import { TwitchStatusModel } from '../database/twitchStatusModel';
import { DBConnectionService } from '../service/DBConnectionService';
import { TwitchConnectionService } from '../service/twitchConnectionService';
import _ from 'lodash';

export abstract class IntervalActionHelper {
  public static twitchNotifyInterval = (client: Client) =>
    setInterval(() => {
      const promiseList = [];
      promiseList.push(DBConnectionService(TwitchNotifyModel).findAll());
      promiseList.push(DBConnectionService(TwitchStatusModel).findAll());
      Promise.all(promiseList).then((result) => {
        const notifyData = result[0];
        const statusData = result[1];
        const twitchConnectionService = new TwitchConnectionService();
        twitchConnectionService.getStreamStatus(statusData.map((data: any) => data.twitch_id))?.then((res) => {
          const updatedStatus = statusData.filter((status: any) =>
            res.some(
              (resData) => resData.is_streaming !== status.is_streaming && resData.twitch_id === status.twitch_id
            )
          );

          updatedStatus.forEach((dtoData) => {
            const targetData = res.find((data) => data.twitch_id === (dtoData as any).twitch_id);
            if (!targetData) {
              return;
            }

            dtoData.update(targetData);

            if (targetData.is_streaming) {
              const postData = notifyData.filter((notify: any) => notify.twitch_id === targetData?.twitch_id);
              postData.forEach((post: any) => {
                const postMessage = post.message ? post.message + '\n' : '';
                client.channels
                  .fetch(post.channel_id)
                  .then((channel) =>
                    (channel as TextChannel).send(`${postMessage}https://twitch.tv/${post.twitch_id}`)
                  );
              });
            }
          });
        });
      });
    }, 10000);
}
