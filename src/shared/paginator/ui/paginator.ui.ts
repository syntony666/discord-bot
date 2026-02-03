import { PageRenderResult } from '../paginator.types';
import { ButtonStyles, CustomIdPrefixes } from '@core/config/constants';

/**
 * Build the interaction response payload for a specific page.
 */
export function buildPaginatorResponse(params: {
  sessionId: string;
  page: PageRenderResult;
  currentPage: number;
  totalPages: number;
}) {
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

  const data: any = { components };

  if (page.content !== undefined) data.content = page.content;
  if (page.embeds !== undefined) data.embeds = page.embeds;

  return data;
}

/**
 * Build Discord message components (Prev / Page / Next buttons).
 */
function buildPaginatorComponents(params: {
  sessionId: string;
  hasPrev: boolean;
  hasNext: boolean;
  pageLabel: string;
}) {
  const { sessionId, hasPrev, hasNext, pageLabel } = params;

  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: ButtonStyles.PRIMARY,
          label: 'Prev',
          customId: `${CustomIdPrefixes.PAGINATOR}:${sessionId}:prev`,
          disabled: !hasPrev,
        },
        {
          type: 2,
          style: ButtonStyles.SUCCESS,
          label: pageLabel,
          customId: `${CustomIdPrefixes.PAGINATOR}:${sessionId}:page`,
        },
        {
          type: 2,
          style: ButtonStyles.PRIMARY,
          label: 'Next',
          customId: `${CustomIdPrefixes.PAGINATOR}:${sessionId}:next`,
          disabled: !hasNext,
        },
      ],
    },
  ];
}
