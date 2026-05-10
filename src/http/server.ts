import Fastify from 'fastify';
import cors from '@fastify/cors';
import { loadConfig } from '../config.js';
import { countArticlesByStatus, getArticleBySlug, listPublishedArticles, listRecentNewsArticles } from '../db/repos/articles_repo.js';
import { articlesCollection } from '../db/mongo.js';
import { writeLossArticlesForResolution, writeTradeArticle } from '../services/article_writer.js';
import type { ResolutionEventPayload, WhaleDto } from '../shared/types.js';
import { buildGoogleNewsSitemapXml, buildRssXml, buildSitemapXml } from './xml_routes.js';
import { renderArticleHtml, renderNewsIndexHtml } from './renderer.js';

export function buildServer() {
  const config = loadConfig();
  const app = Fastify({
    logger: false,
  });

  void app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || config.corsOrigins.length === 0 || config.corsOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error('CORS origin rejected'), false);
    },
  });

  app.get('/health', async () => {
    const counts = await countArticlesByStatus(articlesCollection());
    return {
      ok: true,
      service: 'autonews',
      counts,
      time: new Date().toISOString(),
    };
  });

  app.get('/v1/news', async (request) => {
    const query = request.query as { limit?: string };
    const limit = Number.parseInt(query.limit ?? '25', 10);
    const items = await listPublishedArticles(Number.isFinite(limit) ? limit : 25);
    return { items };
  });

  app.get('/v1/news/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const article = await getArticleBySlug(slug);
    if (!article) {
      reply.code(404);
      return { error: 'not_found' };
    }
    return { article };
  });

  app.post('/v1/hooks/whale', async (request, reply) => {
    if (!isAuthorized(request.headers['x-ingest-secret'])) {
      reply.code(401);
      return { error: 'unauthorized' };
    }
    const written = await writeTradeArticle(request.body as WhaleDto, 'hook');
    return { written };
  });

  app.post('/v1/hooks/resolution', async (request, reply) => {
    if (!isAuthorized(request.headers['x-ingest-secret'])) {
      reply.code(401);
      return { error: 'unauthorized' };
    }
    const written = await writeLossArticlesForResolution(request.body as ResolutionEventPayload, 'hook');
    return { written };
  });

  app.get('/news', async (_request, reply) => {
    const articles = await listPublishedArticles(50);
    reply.type('text/html; charset=utf-8');
    return renderNewsIndexHtml(articles);
  });

  app.get('/news/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const article = await getArticleBySlug(slug);
    if (!article) {
      reply.code(404).type('text/html; charset=utf-8');
      return '<!doctype html><title>Not found</title><h1>Article not found</h1>';
    }
    const related = await listPublishedArticles(6);
    reply.type('text/html; charset=utf-8');
    return renderArticleHtml(article, related);
  });

  app.get('/sitemap.xml', async (_request, reply) => {
    const articles = await listRecentNewsArticles(1000);
    reply.type('application/xml; charset=utf-8');
    return buildSitemapXml(articles);
  });

  app.get('/news-sitemap.xml', async (_request, reply) => {
    const articles = await listRecentNewsArticles(1000);
    reply.type('application/xml; charset=utf-8');
    return buildGoogleNewsSitemapXml(articles);
  });

  app.get('/rss.xml', async (_request, reply) => {
    const articles = await listPublishedArticles(50);
    reply.type('application/rss+xml; charset=utf-8');
    return buildRssXml(articles);
  });

  return app;
}

function isAuthorized(headerValue: unknown): boolean {
  const secret = loadConfig().ingestSecret;
  if (!secret) return true;
  return headerValue === secret;
}

