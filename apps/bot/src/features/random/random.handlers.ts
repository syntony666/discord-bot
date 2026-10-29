import { randomInt } from 'node:crypto';
import { useHandlers } from '@discord-bot/discord-client';
import type { DiscordHelpers } from '@discord-bot/discord-client';
import { createLogger } from '@discord-bot/shared';
import { randomCommand } from './random.command';
import {
  MAX_DICE,
  MAX_SIDES,
  MIN_SIDES,
  parseDiceExpr,
  parsePickOptions,
  rollDice,
} from './random.utils';

const log = createLogger('Random');

const MAX_PICK_LIST_LENGTH = 900;
// crypto.randomInt requires max - min <= 2^48
const MAX_INT_RANGE = 2 ** 48;

/** What this feature actually needs — the bootstrap deps object must cover it. */
export interface RandomDeps {
  discord: DiscordHelpers;
}

export function useRandomHandlers(_deps: RandomDeps) {
  const h = useHandlers(randomCommand);

  h.handler('pick', async (ctx) => {
    const options = parsePickOptions(ctx.options.options);
    if (options.length < 2) {
      return ctx.error('選項不足', '請以 `,` `，` `;` `、` `；` 分隔，提供至少 **2** 個選項');
    }
    const picked = options[randomInt(options.length)];
    const joined = options.join('、');
    const list =
      joined.length > MAX_PICK_LIST_LENGTH
        ? `${joined.slice(0, MAX_PICK_LIST_LENGTH)}…（共 ${options.length} 個選項）`
        : joined;
    await ctx.info('隨機挑選', `從 **${list}** 中抽出：**${picked}**`);
    log.info({ guildId: ctx.guildId, count: options.length }, 'Random pick');
  });

  h.handler('roll', async (ctx) => {
    const expr = ctx.options.expr ?? '1d6';
    const spec = parseDiceExpr(expr);
    if (!spec) {
      return ctx.error(
        '格式無效',
        `骰子格式為 \`NdM\`，可加 \`kh\`/\`dh\`/\`kl\`/\`dl\` 修飾（例：**4d6kh3**）；骰子 **1-${MAX_DICE}** 顆、**${MIN_SIDES}-${MAX_SIDES}** 面、修飾數量須小於骰子數`
      );
    }
    const { rolls, kept, total } = rollDice(spec, (sides) => randomInt(1, sides + 1));
    const shown = rolls.map((v, i) => (kept[i] ? `${v}` : `~~${v}~~`)).join(', ');
    await ctx.info('擲骰結果', `**${expr.trim().toLowerCase()}**：[${shown}] = **${total}**`);
    log.info({ guildId: ctx.guildId, expr }, 'Dice rolled');
  });

  h.handler('number', async (ctx) => {
    const min = ctx.options.min ?? 1;
    const max = ctx.options.max ?? 100;
    if (min > max) {
      return ctx.error('範圍無效', '最小值必須小於等於最大值');
    }
    if (max - min >= MAX_INT_RANGE) {
      return ctx.error('範圍過大', '請縮小範圍');
    }
    const n = randomInt(min, max + 1);
    await ctx.info('隨機數字', `從 **${min}** 到 **${max}** 抽出：**${n}**`);
    log.info({ guildId: ctx.guildId, min, max, n }, 'Random number');
  });

  return h.collect();
}
