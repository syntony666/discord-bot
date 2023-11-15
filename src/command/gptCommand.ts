import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../interface/command";
import { Configuration, OpenAIApi } from "openai";
import { random } from "lodash";

export const GPTCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("gpt")
    .setDescription("叫AI陪你聊天 (Beta)")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("chat")
        .setDescription("叫AI陪你聊天 (Beta)")
        .addStringOption((option) =>
          option
            .setName("content")
            .setDescription("設定你要跟他說的話")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("draw-sd")
        .setDescription("叫AI幫你生成Stable Diffusion Prompt (Beta)")
        .addStringOption((option) =>
          option
            .setName("content")
            .setDescription("設定你要叫他生成的圖")
            .setRequired(true)
        )
    ),
  execute: async (interaction) => {
    const content = interaction.options.get("content")?.value as string;
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);
    await interaction.deferReply();
    const systemPrompt = {
      chat: "You are the well-trained AI model. Please provide a reasonable and complete response, avoiding meaningless piecing together of words to maintain the fluency and coherence of the conversation. Please answer in Traditional Chinese. Thank you.",
      "draw-sd": `以下是一個繪圖AI的Prompt範例，描繪"穿著透明毛衣的女孩": (best quality) (masterpiece), (highly detailed), original, extremely detailed wallpaper,solo,{beautiful detailed eyes},1girl,full body,turtleneck,ribbed sweater,see-through,wet clothes。 以下是一個繪圖AI的Prompt範例，描繪"圍著浴巾的出浴少女": (best quality) (masterpiece), (highly detailed), original, extremely detailed wallpaper,solo,{beautiful detailed eyes},1girl,full body,(best quality) (masterpiece), (highly detailed), original, extremely detailed wallpaper,solo,1girl,full body,towel,standing,wet hair,wet,naughty face。 以下是一個繪圖AI的Prompt範例，描繪"花田裡的新娘": (best quality) (masterpiece), (highly detailed), original, extremely detailed wallpaper,solo,{beautiful detailed eyes},1girl siting in flower field,{an extremely delicate and beautiful},long pink hair.beautiful and detailed eyes.(a lot of Colorful bubbles).White wedding dress,wedding veil.butterflys flying.Hair fluttering.(smile)。 請根據以上規則，撰寫一個Prompt。`,
    };
    const subcommand: string = interaction.options.getSubcommand();
    openai
      .createChatCompletion({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              systemPrompt[subcommand as keyof typeof systemPrompt] ?? null,
          },
          { role: "user", content: content },
        ],
        temperature: 0.4,
        //         max_tokens: 500,
      })
      .then((res) => {
        const embed = new EmbedBuilder()
          .setDescription(res.data.choices[0].message?.content ?? null)
          .setFooter({ text: "Powered by OpenAI GPT-3.5 Turbo" })
          .setTimestamp();
        interaction.editReply({ embeds: [embed] });
      })
      .catch((err) => console.log(err));
  },
};
