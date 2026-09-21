import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionContextType,
} from 'discord-api-types/v10';
import type {
  APIApplicationCommandOption,
  RESTPostAPIApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import type {
  CommandDef,
  OptionDef,
  SubcommandDef,
  SubcommandGroupDef,
} from './types';

const OPTION_PASSTHROUGH = [
  'autocomplete',
  'channel_types',
  'min_value',
  'max_value',
  'min_length',
  'max_length',
  'name_localizations',
  'description_localizations',
] as const;

const COMMAND_PASSTHROUGH = [
  'default_member_permissions',
  'nsfw',
  'name_localizations',
  'description_localizations',
  'integration_types',
] as const;

function pick<T extends object, K extends keyof T>(src: T, keys: readonly K[]) {
  const out: Partial<Pick<T, K>> = {};
  for (const k of keys) {
    if (src[k] !== undefined) out[k] = src[k];
  }
  return out;
}

function optionToApi(option: OptionDef): APIApplicationCommandOption {
  return {
    name: option.name,
    description: option.description ?? '',
    type: option.type,
    required: option.required,
    choices: option.choices?.map((c) => ({
      name: c.name,
      value: c.value,
      name_localizations: c.name_localizations,
    })),
    ...pick(option, OPTION_PASSTHROUGH),
  } as APIApplicationCommandOption;
}

function subToApi(sub: SubcommandDef): APIApplicationCommandOption {
  return {
    type: ApplicationCommandOptionType.Subcommand,
    name: sub.name,
    description: sub.description,
    options: sub.options?.map(optionToApi),
    ...pick(sub, ['name_localizations', 'description_localizations'] as const),
  } as APIApplicationCommandOption;
}

function groupToApi(group: SubcommandGroupDef): APIApplicationCommandOption {
  return {
    type: ApplicationCommandOptionType.SubcommandGroup,
    name: group.name,
    description: group.description,
    options: group.subcommands.map(subToApi),
    ...pick(group, ['name_localizations', 'description_localizations'] as const),
  } as APIApplicationCommandOption;
}

/** Serialize a CommandDef into a Discord REST command body. */
export function toRestBody(cmd: CommandDef): RESTPostAPIApplicationCommandsJSONBody {
  const options: APIApplicationCommandOption[] = [
    ...(cmd.options ?? []).map(optionToApi),
    ...(cmd.subcommands ?? []).map(subToApi),
    ...(cmd.groups ?? []).map(groupToApi),
  ];

  const contexts =
    cmd.contexts !== undefined
      ? [...cmd.contexts]
      : cmd.guildOnly
        ? [InteractionContextType.Guild]
        : undefined;

  return {
    type: cmd.type ?? ApplicationCommandType.ChatInput,
    name: cmd.command,
    description: cmd.description,
    ...(options.length > 0 ? { options } : {}),
    ...(contexts !== undefined ? { contexts } : {}),
    ...pick(cmd, COMMAND_PASSTHROUGH),
  } as RESTPostAPIApplicationCommandsJSONBody;
}
