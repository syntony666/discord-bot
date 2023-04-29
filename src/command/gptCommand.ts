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
    ),
  execute: async (interaction) => {
    const content = interaction.options.get("content")?.value as string;
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);
    await interaction.deferReply();
    openai
      .createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are the well-trained AI model. Please provide a reasonable and complete response, avoiding meaningless piecing together of words to maintain the fluency and coherence of the conversation. Please answer in Traditional Chinese. Thank you.",
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
