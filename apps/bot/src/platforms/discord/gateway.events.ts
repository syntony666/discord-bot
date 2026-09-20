import { GatewayDispatchEvents } from 'discord-api-types/v10';
import {
  emitMessageCreate,
  emitInteractionCreate,
  emitGuildMemberAdd,
  emitGuildMemberRemove,
  emitReactionAdd,
  emitReactionRemove,
  emitGuildCreate,
  emitGuildDelete,
} from '@core/rx/bus';
import type { GatewayDispatchPayload } from 'discord-api-types/v10';

export function handleGatewayDispatch(payload: GatewayDispatchPayload): void {
  switch (payload.t) {
    case GatewayDispatchEvents.MessageCreate:
      emitMessageCreate(payload.d);
      return;
    case GatewayDispatchEvents.InteractionCreate:
      emitInteractionCreate(payload.d);
      return;
    case GatewayDispatchEvents.GuildMemberAdd:
      emitGuildMemberAdd(payload.d);
      return;
    case GatewayDispatchEvents.GuildMemberRemove:
      emitGuildMemberRemove(payload.d);
      return;
    case GatewayDispatchEvents.MessageReactionAdd:
      emitReactionAdd(payload.d);
      return;
    case GatewayDispatchEvents.MessageReactionRemove:
      emitReactionRemove(payload.d);
      return;
    case GatewayDispatchEvents.GuildCreate:
      emitGuildCreate(payload.d);
      return;
    case GatewayDispatchEvents.GuildDelete:
      emitGuildDelete(payload.d);
      return;
    default:
      return;
  }
}
