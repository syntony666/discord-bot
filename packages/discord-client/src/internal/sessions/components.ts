import { ButtonStyle, ComponentType } from 'discord-api-types/v10';
import type {
  APIButtonComponentWithCustomId,
  APIEmbed,
  APIModalSubmitInteraction,
} from 'discord-api-types/v10';
import type { PaginatePending } from './store.type';
import { withEmbedDefaults, type UiConfig } from '../embeds';

export const button = (
  customId: string,
  label: string,
  style:
    | ButtonStyle.Primary
    | ButtonStyle.Secondary
    | ButtonStyle.Success
    | ButtonStyle.Danger,
  disabled = false
): APIButtonComponentWithCustomId => ({
  type: ComponentType.Button,
  custom_id: customId,
  label,
  style,
  disabled,
});

export const row = <T>(...components: T[]) => ({
  type: ComponentType.ActionRow as const,
  components,
});

export const modalFieldValues = (
  i: APIModalSubmitInteraction
): Record<string, string> => {
  const values: Record<string, string> = {};
  for (const c of i.data.components) {
    if (c.type === ComponentType.ActionRow) {
      for (const t of c.components) {
        if (t.type === ComponentType.TextInput) values[t.custom_id] = t.value;
      }
    } else if (
      c.type === ComponentType.Label &&
      c.component.type === ComponentType.TextInput
    ) {
      values[c.component.custom_id] = c.component.value;
    }
  }
  return values;
};

export const paginateEmbed = (s: PaginatePending, ui?: UiConfig): APIEmbed =>
  withEmbedDefaults(
    s.render(
      s.items.slice(s.page * s.pageSize, (s.page + 1) * s.pageSize),
      s.page,
      Math.ceil(s.items.length / s.pageSize)
    ),
    s.username,
    ui
  );

export const paginateRow = (base: string, page: number, totalPages: number) =>
  row(
    button(`${base}:prev`, '◀', ButtonStyle.Secondary, page === 0),
    button(`${base}:jump`, `${page + 1}/${totalPages}`, ButtonStyle.Secondary),
    button(
      `${base}:next`,
      '▶',
      ButtonStyle.Secondary,
      page === totalPages - 1
    )
  );
