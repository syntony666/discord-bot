import type {
  APIApplicationCommand,
  RESTPostAPIApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

// Deep-equality with sorted object keys; arrays keep order.
const canon = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canon)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, canon((v as Record<string, unknown>)[k])])
        )
      : v;

const eq = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

const sortedNums = (a?: readonly number[] | null) => (a ? [...a].sort((x, y) => x - y) : []);

// Runtime-shape view of an option across all option-type union members.
interface AnyOption {
  name: string;
  description?: string;
  type: number;
  required?: boolean;
  options?: AnyOption[];
  choices?: { name: string; value: unknown; name_localizations?: object | null }[];
  channel_types?: readonly number[];
  autocomplete?: boolean;
  min_value?: unknown;
  max_value?: unknown;
  min_length?: number;
  max_length?: number;
  name_localizations?: object | null;
  description_localizations?: object | null;
}

const isSub = (o: AnyOption) =>
  o.type === ApplicationCommandOptionType.Subcommand ||
  o.type === ApplicationCommandOptionType.SubcommandGroup;

// Normalize an option to canonical form: every key present, defaults filled.
const normOption = (o: AnyOption): Record<string, unknown> => ({
  name: o.name,
  description: o.description ?? '',
  type: o.type,
  name_localizations: o.name_localizations ?? {},
  description_localizations: o.description_localizations ?? {},
  ...(isSub(o)
    ? { options: (o.options ?? []).map(normOption) }
    : {
        required: o.required ?? false,
        autocomplete: o.autocomplete ?? false,
        choices: (o.choices ?? []).map((c) => ({
          name: c.name,
          value: c.value,
          name_localizations: c.name_localizations ?? {},
        })),
        channel_types: sortedNums(o.channel_types),
        min_value: o.min_value ?? null,
        max_value: o.max_value ?? null,
        min_length: o.min_length ?? null,
        max_length: o.max_length ?? null,
      }),
});

const ALL_CONTEXTS = [0, 1, 2];
const DEFAULT_INTEGRATION = [0];

type AnyCommand = {
  name: string;
  description?: string | null;
  type?: number;
  options?: AnyOption[] | null;
  contexts?: readonly number[] | null;
  integration_types?: readonly number[] | null;
  nsfw?: boolean;
  default_member_permissions?: string | null;
  name_localizations?: object | null;
  description_localizations?: object | null;
};

// Normalize a command (local body or remote object) to canonical form.
// Local-omitted fields resolve to Discord defaults — the values a PUT
// overwrite would produce anyway.
const normCommand = (c: AnyCommand): Record<string, unknown> => ({
  name: c.name,
  description: c.description || null,
  type: c.type ?? 1,
  options: (c.options ?? []).map(normOption),
  contexts: c.contexts === undefined ? ALL_CONTEXTS : sortedNums(c.contexts),
  integration_types:
    c.integration_types === undefined ? DEFAULT_INTEGRATION : sortedNums(c.integration_types),
  nsfw: c.nsfw ?? false,
  default_member_permissions:
    c.default_member_permissions === undefined ? null : c.default_member_permissions,
  name_localizations: c.name_localizations ?? {},
  description_localizations: c.description_localizations ?? {},
});

const key = (c: { name: string; type?: number }) => `${c.type ?? 1}:${c.name}`;

/** True when the remote command list already equals the desired definitions. */
export function commandsMatch(
  local: readonly RESTPostAPIApplicationCommandsJSONBody[],
  remote: readonly APIApplicationCommand[]
): boolean {
  if (local.length !== remote.length) return false;
  const remoteByKey = new Map(remote.map((c) => [key(c), normCommand(c as AnyCommand)]));
  return local.every((l) => {
    const r = remoteByKey.get(key(l));
    return r !== undefined && eq(normCommand(l as AnyCommand), r);
  });
}
