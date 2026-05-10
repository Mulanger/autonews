import { request } from 'undici';
import { loadConfig } from '../config.js';
import type { ArticleDraft, ArticleEvent } from '../shared/types.js';
import { buildTemplateDraft } from './article_templates.js';
import { compactUsd, displayDate, formatPrice, formatUsd, sanitizeWalletLabels } from '../shared/format.js';

interface MiniMaxChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

export async function generateArticleDraft(event: ArticleEvent): Promise<{
  draft: ArticleDraft;
  provider: 'minimax' | 'template';
  model: string;
  usedFallback: boolean;
  error?: string;
}> {
  const config = loadConfig();
  if (!config.aiGenerationEnabled || !config.minimaxApiKey) {
    return {
      draft: buildTemplateDraft(event),
      provider: 'template',
      model: 'template',
      usedFallback: true,
      error: config.minimaxApiKey ? undefined : 'MINIMAX_API_KEY not configured',
    };
  }

  try {
    const response = await request(`${config.minimaxBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.minimaxApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.minimaxModel,
        messages: buildMessages(event),
        temperature: 0.58,
        top_p: 0.9,
        max_completion_tokens: config.aiMaxCompletionTokens,
      }),
      bodyTimeout: 30_000,
      headersTimeout: 30_000,
    });

    const payload = (await response.body.json()) as MiniMaxChatResponse;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`MiniMax HTTP ${response.statusCode}`);
    }
    if (payload.base_resp?.status_code && payload.base_resp.status_code !== 0) {
      throw new Error(payload.base_resp.status_msg || `MiniMax status ${payload.base_resp.status_code}`);
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('MiniMax response had no content');

    return {
      draft: sanitizeDraft(parseArticleJson(content)),
      provider: 'minimax',
      model: config.minimaxModel,
      usedFallback: false,
    };
  } catch (err) {
    if (config.aiRequireSuccess) throw err;
    return {
      draft: buildTemplateDraft(event),
      provider: 'template',
      model: 'template',
      usedFallback: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function parseArticleJson(content: string): ArticleDraft {
  const cleaned = stripThinkBlocks(content);
  const jsonText = extractJsonObject(cleaned);
  const parsed = JSON.parse(jsonText) as Partial<ArticleDraft>;
  return sanitizeDraft(parsed);
}

export function extractJsonObject(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model response');
  }
  return content.slice(start, end + 1);
}

function stripThinkBlocks(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function sanitizeDraft(input: Partial<ArticleDraft>): ArticleDraft {
  const body = Array.isArray(input.body)
    ? input.body.map((paragraph) => String(paragraph).trim()).filter((paragraph) => paragraph.length > 0)
    : [];
  const tags = Array.isArray(input.tags)
    ? input.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 6)
    : [];

  if (!input.title || !input.dek || body.length < 3) {
    throw new Error('Article draft is missing title, dek, or body paragraphs');
  }

  return {
    title: sanitizeHeadline(String(input.title).trim()).slice(0, 118),
    dek: sanitizeWalletLabels(String(input.dek).trim()).slice(0, 260),
    body: body.slice(0, 8).map((paragraph) => sanitizeWalletLabels(paragraph).slice(0, 1100)),
    tags,
  };
}

function buildMessages(event: ArticleEvent) {
  const facts = event.facts;
  const factLines = [
    `Article type: ${event.kind}`,
    `Trader label: ${facts.traderName}`,
    `Wallet: ${facts.wallet}`,
    `Market: ${facts.marketTitle}`,
    `Market slug: ${facts.marketSlug ?? 'unknown'}`,
    `Side: ${facts.side}`,
    `Outcome traded: ${facts.outcome}`,
    `Trade amount: ${formatUsd(facts.amountUsd)} (${compactUsd(facts.amountUsd)})`,
    `Shares: ${Math.round(facts.shares).toLocaleString('en-US')}`,
    `Entry price: ${formatPrice(facts.priceCents)}`,
    `Trade time: ${displayDate(facts.timestamp)}`,
    `Condition ID: ${facts.conditionId ?? 'unknown'}`,
    `Transaction hash: ${facts.transactionHash ?? 'unknown'}`,
  ];

  if (event.kind === 'whale_loss') {
    factLines.push(
      `Resolved winning outcome: ${facts.winningOutcome ?? 'unknown'}`,
      `Estimated realized loss: ${formatUsd(facts.lossUsd ?? Math.abs(facts.pnlUsd ?? facts.amountUsd))}`,
      `Resolved time: ${facts.resolvedAt ? displayDate(facts.resolvedAt) : 'unknown'}`,
    );
  }

  return [
    {
      role: 'system',
      content:
        'You are a careful data journalist for Polywhale. You write factual news articles about public Polymarket whale activity using only the supplied facts. Add clear context and caveats, but never fabricate motives, identities, broader portfolio results, insider knowledge, price movement, or investment advice. Return JSON only.',
    },
    {
      role: 'user',
      content: [
        'Write one article from this fixed fact set.',
        '',
        factLines.join('\n'),
        '',
        'Return exactly this JSON shape:',
        '{"title":"specific factual headline","dek":"one sentence summary","body":["lead paragraph","context paragraph","source paragraph","caveat paragraph"],"tags":["Polymarket","Whale trade"]}',
        '',
        'Rules:',
        '- 4 to 7 body paragraphs.',
        '- Lead with what happened, the amount, the market, the side/outcome, and the timestamp.',
        '- Include one context paragraph explaining why this whale flow matters without claiming it predicts the result.',
        '- Mention Polywhale once as the data source.',
        '- Use plain English and write like a real short market-news article, not a template.',
        '- Use Polymarket and Polywhale naturally; do not stuff keywords.',
        '- Do not put wallet addresses, 0x strings, or shortened wallet keys in the title or dek.',
        '- If the trader label is "Polymarket whale", use that phrase instead of the wallet address.',
        '- Do not use clickbait verbs such as burns, crushed, wrecked, insane, shocking, or guaranteed.',
        '- Do not say the trader is right, smart, reckless, doomed, or guaranteed to win.',
        '- Include "not financial advice" only if it fits naturally; do not make the article sound legalistic.',
      ].join('\n'),
    },
  ];
}

function sanitizeHeadline(value: string): string {
  return sanitizeWalletLabels(value)
    .replace(/\b(burns|burned|crushed|wrecked|insane|shocking)\b/gi, (match) => {
      const lower = match.toLowerCase();
      if (lower === 'burns' || lower === 'burned') return 'loses';
      if (lower === 'crushed' || lower === 'wrecked') return 'loses';
      return 'large';
    })
    .replace(/\s+/g, ' ')
    .trim();
}
