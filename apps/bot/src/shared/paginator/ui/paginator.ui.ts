import { PageRenderResult } from '../paginator.types';
import { CustomIdPrefixes } from '@core/config/constants';
import {
  ButtonStyle,
  ComponentType,
  type APIActionRowComponent,
  type APIComponentInMessageActionRow,
  type APIInteractionResponseCallbackData,
} from 'discord-api-types/v10';

export function buildPaginatorResponse(params: {
  sessionId: string;
  page: PageRenderResult;
  currentPage: number;
  totalPages: number;
}): APIInteractionResponseCallbackData {
  const { sessionId, page, currentPage, totalPages } = params;

  const hasPrev = currentPage > 0;
  const hasNext = currentPage < totalPages - 1;
  const pageLabel = `${currentPage + 1}/${totalPages || 1}`;

  const components = buildPaginatorComponents({
    sessionId,
    hasPrev,
    hasNext,
    pageLabel,
  });

  const data: APIInteractionResponseCallbackData = { components };

  if (page.content !== undefined) data.content = page.content;
  if (page.embeds !== undefined) data.embeds = page.embeds;

  return data;
}

function buildPaginatorComponents(params: {
  sessionId: string;
  hasPrev: boolean;
  hasNext: boolean;
  pageLabel: string;
}): APIActionRowComponent<APIComponentInMessageActionRow>[] {
  const { sessionId, hasPrev, hasNext, pageLabel } = params;

  return [
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.Button,
          style: ButtonStyle.Primary,
          label: 'Prev',
          custom_id: `${CustomIdPrefixes.PAGINATOR}:${sessionId}:prev`,
          disabled: !hasPrev,
        },
        {
          type: ComponentType.Button,
          style: ButtonStyle.Success,
          label: pageLabel,
          custom_id: `${CustomIdPrefixes.PAGINATOR}:${sessionId}:page`,
        },
        {
          type: ComponentType.Button,
          style: ButtonStyle.Primary,
          label: 'Next',
          custom_id: `${CustomIdPrefixes.PAGINATOR}:${sessionId}:next`,
          disabled: !hasNext,
        },
      ],
    },
  ];
}
