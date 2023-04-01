import { REST, RESTPostAPIApplicationCommandsJSONBody, Routes } from "discord.js"
import { commandList, guildCommandList } from "../config";

export const registerCmd = () => {
  const commandData: RESTPostAPIApplicationCommandsJSONBody[] = [];
  const guildCommandData: RESTPostAPIApplicationCommandsJSONBody[] = [];
  const rest = new REST({ version: "10" }).setToken(
    process.env.CLIENT_TOKEN as string
  );

  commandList.forEach((cmd) => {
    commandData.push(cmd.data.toJSON());
  });

  console.log(commandData);

  rest
    .put(Routes.applicationCommands(process.env.CLIENT_ID as string), {
      body: commandData,
    })
    .then(() => console.log("Successfully registered application commands."))
    .catch(console.error);

  guildCommandList.forEach((cmd) => {
    guildCommandData.push(cmd.data.toJSON());
  });

  console.log(guildCommandData);

  rest
    .put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID as string,
        process.env.AUTHOR_GUILD as string
      ),
      { body: guildCommandData }
    )
    .then(() =>
      console.log("Successfully registered application guild commands.")
    )
    .catch(console.error);
};