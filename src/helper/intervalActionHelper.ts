import { Client, TextChannel } from 'discord.js';
import { TwitchNotifyModel } from '../database/twitchNotifyModel';
import { TwitchStatusModel } from '../database/twitchStatusModel';
import { DBConnectionService } from '../service/DBConnectionService';
import { TwitchConnectionService } from '../service/twitchConnectionService';
import _ from 'lodash';

export abstract class IntervalActionHelper {
  public static twitchNotifyInterval = (client: Client) =>
    setInterval(() => {
      const twitchNotifyDTO = DBConnectionService(TwitchNotifyModel);
      const twitchStatusDTO = DBConnectionService(TwitchStatusModel);
      Promise.all([twitchNotifyDTO.findAll(), twitchStatusDTO.findAll()]).then((result) => {
        const notifyData = result[0];
        const statusData = result[1];
        const twitchConnectionService = new TwitchConnectionService();
        twitchConnectionService.getStreamStatus(statusData.map((data: any) => data.twitch_id))?.then((res) => {
          const updatedStatus = _.differenceBy(res, statusData, 'is_streaming');
          statusData.forEach((dtoData: any) => {
            const targetData = updatedStatus.find((data) => data.twitch_id === dtoData.twitch_id);
            console.log('1 >>>', targetData);
            if (!targetData) {
              return;
            }
            dtoData.update(targetData);
            if (targetData.is_streaming) {
              const postData = notifyData.filter((notify: any) => notify.twitch_id === targetData?.twitch_id);
              console.log('2 >>>', postData);
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
    }, 3000);
}
