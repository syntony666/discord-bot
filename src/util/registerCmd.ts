import { REST, RESTPostAPIApplicationCommandsJSONBody, Routes } from "discord.js"
import { commandList } from "../config";

export const registerCmd = () => {
    const commandData: RESTPostAPIApplicationCommandsJSONBody[] = []
    const rest = new REST({ version: '10' }).setToken(process.env.CLIENT_TOKEN as string)

    commandList.forEach((cmd) => {
        commandData.push(cmd.data.toJSON());
    });

    console.log(commandData);

    rest.put(Routes.applicationCommands(process.env.CLIENT_ID as string), { body: commandData })
        .then(() => console.log('Successfully registered application commands.'))
        .catch(console.error);
}