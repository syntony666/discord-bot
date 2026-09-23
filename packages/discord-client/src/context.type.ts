import type {
  APIChatInputApplicationCommandInteraction,
  APIEmbed,
  APIInteractionResponseCallbackData,
  APIMessage,
  APIMessageComponentInteraction,
  APIModalSubmitInteraction,
  APIUser,
} from 'discord-api-types/v10';

export interface ConfirmOptions {
  title?: string;
  description: string;
  fields?: APIEmbed['fields'];
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  timeoutMs?: number;
}

export interface PaginateOptions<T> {
  items: T[];
  render(page: T[], pageIndex: number, totalPages: number): APIEmbed;
  pageSize?: number;
  emptyText?: string;
  timeoutMs?: number;
}

export interface ModalField {
  id: string;
  label: string;
  style?: 'short' | 'paragraph';
  value?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

export interface ModalOptions {
  title: string;
  fields: ModalField[];
  timeoutMs?: number;
}

export interface PromptOptions {
  content: string;
  timeoutMs?: number;
  filter?: (message: APIMessage) => boolean;
}

export type ReplyData = APIInteractionResponseCallbackData | string;

export interface CommandContext<
  TOptions = Record<string, unknown>,
  TSubcommand extends string = string,
  TGroup extends string = string,
> {
  readonly interaction: APIChatInputApplicationCommandInteraction;
  readonly command: string;
  readonly subcommand?: TSubcommand;
  readonly subcommandGroup?: TGroup;
  readonly options: TOptions;
  readonly guildId?: string;
  readonly user: APIUser;

  reply(data: ReplyData, ephemeral?: boolean): Promise<void>;
  success(description: string): Promise<void>;
  error(description: string): Promise<void>;
  defer(ephemeral?: boolean): Promise<void>;
  followUp(data: ReplyData): Promise<void>;
  editReply(data: ReplyData): Promise<void>;

  confirm(options: ConfirmOptions): Promise<boolean>;
  paginate<T>(options: PaginateOptions<T>): Promise<void>;
  modal(options: ModalOptions): Promise<Record<string, string> | null>;
  prompt(options: PromptOptions): Promise<APIMessage | null>;
}

export interface ComponentContext {
  readonly interaction: APIMessageComponentInteraction | APIModalSubmitInteraction;
  readonly customId: string;
  readonly params: Record<string, string>;
  readonly guildId?: string;
  readonly user: APIUser;

  reply(data: ReplyData, ephemeral?: boolean): Promise<void>;
  update(data: ReplyData): Promise<void>;
  deferUpdate(): Promise<void>;
  followUp(data: ReplyData): Promise<void>;

  confirm(options: ConfirmOptions): Promise<boolean>;
  paginate<T>(options: PaginateOptions<T>): Promise<void>;
  modal(options: ModalOptions): Promise<Record<string, string> | null>;
  prompt(options: PromptOptions): Promise<APIMessage | null>;
}
