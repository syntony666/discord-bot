import { Subject } from 'rxjs';
import { Bot, handleMessageCreate } from '@discordeno/bot';

type MessageCreateEvent = Parameters<NonNullable<Bot['events']['messageCreate']>>[0];

export const messageCreate$ = new Subject<MessageCreateEvent>();
