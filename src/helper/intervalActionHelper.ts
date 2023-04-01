import { Client, Embed, EmbedBuilder, TextChannel } from 'discord.js';
import { TwitchNotifyModel } from '../database/twitchNotifyModel';
import { TwitchStatusModel } from '../database/twitchStatusModel';
import { DBConnectionService } from '../service/DBConnectionService';
import { TwitchConnectionService } from '../service/twitchConnectionService';
import _, { min } from 'lodash';
import { Model } from 'sequelize/types';
import { embedColor } from "../config";

export abstract class IntervalActionHelper {
  public static twitchNotifyInterval = (client: Client) =>
    setInterval(() => {
      let notifyDataList: Model<any, any>[];
      let statusDataList: Model<any, any>[];
      let twitchDataList: {
        twitch_id: string;
        name: string;
        profile_image_url: string | undefined;
        is_streaming: boolean;
        title: string;
        game_name: string;
      }[];

      const promiseDBList = [];
      promiseDBList.push(DBConnectionService(TwitchNotifyModel).findAll());
      promiseDBList.push(DBConnectionService(TwitchStatusModel).findAll());
      Promise.all(promiseDBList)
        .then((result) => {
          notifyDataList = result[0];
          statusDataList = result[1];

          const promiseTwitchList = [];
          const twitchConnectionService = new TwitchConnectionService();
          promiseTwitchList.push(
            twitchConnectionService.getStreamStatus(
              statusDataList.map((data: any) => data.twitch_id)
            )
          );
          promiseTwitchList.push(
            twitchConnectionService.getUserInfo(
              statusDataList.map((data: any) => data.twitch_id)
            )
          );
          return Promise.all(promiseTwitchList);
        })
        .then((result) => {
          let postData: {}[] = [];

          twitchDataList = _.toArray(
            _.merge(
              _.keyBy(result[0], "twitch_id"),
              _.keyBy(result[1], "twitch_id")
            )
          ).map((data: any) => ({
            twitch_id: data.twitch_id ?? "",
            name: data.name,
            profile_image_url: data.profile_image_url,
            is_streaming: data.is_streaming ? true : false,
            title: data.title ?? "",
            game_name: data.game_name ?? "",
          }));
          const updatedStatus = statusDataList.filter((status: any) =>
            twitchDataList.some(
              (resData: any) =>
                resData.is_streaming !== status.is_streaming &&
                resData.twitch_id === status.twitch_id
            )
          );
          updatedStatus.forEach((dtoData) => {
            const targetData = twitchDataList.find(
              (data) => data.twitch_id === (dtoData as any).twitch_id
            );
            if (!targetData) {
              return;
            }
            dtoData.update(targetData);
            if (targetData.is_streaming) {
              postData.push(
                ...notifyDataList.filter(
                  (notify: any) => notify.twitch_id === targetData?.twitch_id
                )
              );
            }
          });
          return postData;
        })
        .then((postData) => {
          postData.forEach((post: any) => {
            const twitchData = twitchDataList.find(
              (data) => data.twitch_id === post.twitch_id
            );
            const postMessage = post.message;
            let embed = new EmbedBuilder()
              .setColor(embedColor.get("twitch-notify") ?? null)
              .setTitle(twitchData?.name ?? null)
              .setURL(`https://twitch.tv/${post.twitch_id}`)
              .setThumbnail(twitchData?.profile_image_url ?? null)
              .setFields(
                {
                  name: "標題",
                  value: twitchData?.title ?? "\u200B",
                  inline: false,
                },
                {
                  name: "正在玩",
                  value: twitchData?.game_name ?? "\u200B",
                  inline: false,
                }
              )
              .setTimestamp();
            client.channels
              .fetch(post.channel_id)
              .then((channel) =>
                (channel as TextChannel).send({
                  embeds: [embed],
                  content: postMessage,
                })
              );
          });
        })
        .catch((err) => console.log(err));
    }, 10000);
}
