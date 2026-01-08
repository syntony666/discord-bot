import { PageRenderResult } from './paginator.types';

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
          style: 2,
          label: 'Prev',
          customId: `pg:${sessionId}:prev`,
          disabled: !hasPrev,
        },
        {
          type: 2,
          style: 1,
          label: pageLabel,
          customId: `pg:${sessionId}:page`,
        },
        {
          type: 2,
          style: 1,
          label: 'Next',
          customId: `pg:${sessionId}:next`,
          disabled: !hasNext,
        },
      ],
    },
  ];
}
