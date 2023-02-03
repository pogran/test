import prisma from '#instances/prisma';
import { EnBookStatus, EnChapterStatus } from '@prisma/client';
import { Request, Response } from 'express';
import moment from 'moment';
import _isEmpty from 'lodash/isEmpty'
import { isHentai } from '../helpers/index'

const getItems = async (req: Request, res: Response) => {
	const host = req.get('host');
	const domain = 'https://' + host;
	const isHentai = domain === 'https://хентайманга.рф';

	const books = await prisma.book.findMany({
		where: {
			status: {
				not: EnBookStatus.DRAFT
			},
			isHentai,
		},
		include: {
			chapters: {
				take: 1,
				orderBy: {
					id: 'desc'
				}
			}
		}
	});

  res.header('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
		<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
			<sitemap>
				<loc>${domain}/sitemap/sitemap-pages.xml</loc>
				<lastmod>${moment().format('YYYY-MM-DDTHH:00:00Z')}</lastmod>
			</sitemap>
			<sitemap>
				<loc>${domain}/sitemap/sitemap-collections.xml</loc>
				<lastmod>${moment().format('YYYY-MM-DDTHH:00:00Z')}</lastmod>
			</sitemap>
			<sitemap>
				<loc>${domain}/sitemap/sitemap-books.xml</loc>
				<lastmod>${moment().format('YYYY-MM-DDTHH:00:00Z')}</lastmod>
			</sitemap>
		${books
			.map(book => {
				const chapter = book.chapters.length ? book.chapters[0] : null;
				if (!chapter) {
					return `
						<sitemap>
							<loc>${domain}/sitemap/${book.id}.xml</loc>
						</sitemap>
					`;
				}

				return `
					<sitemap>
						<loc>${domain}/sitemap/${book.id}.xml</loc>
						<lastmod>${moment(chapter.createdAt).format('YYYY-MM-DDTHH:mm:ssZ')}</lastmod>
					</sitemap>
				`;
			})
			.join('')}
	</sitemapindex>`);
}

const getItem = async (req: Request, res: Response) => {
	const host = req.get('host');
	const domain = 'https://' + host;
	const bookId = +(req.params.bookId || '0');
	
	
	const book = await prisma.book.findFirst({
		where: {
			id: bookId,
			status: {
				not: EnBookStatus.DRAFT,
			}
		},
		include: {
			chapters: true
		}
	});

	res.header('Content-Type', 'application/xml');
	if (!book || _isEmpty(book.chapters)) {
		return res.send('<?xml version="1.0" encoding="UTF-8"?>');
	}

	res.send(`<?xml version="1.0" encoding="UTF-8"?>
		<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
		${book
			.chapters
			.filter(chapter => chapter.status === EnChapterStatus.ACTIVE)
			.map(chapter => {
				return `
					<url>
						<loc>${domain}/manga/${book.slug}/ch${chapter.id}</loc>
						<lastmod>${moment(chapter.createdAt).format('YYYY-MM-DDTHH:mm:ssZ')}</lastmod>
						<priority>0.8</priority>
					</url>
				`;
			})
			.join('')}
		</urlset>
	`)
}

const getBooks = async (req: Request, res: Response) => {
	const host = req.get('host');
	const domain = 'https://' + host;
	const isHentai = domain === 'https://хентайманга.рф';
	
	const books = await prisma.book.findMany({
		where: {
			status: {
				not: EnBookStatus.DRAFT
			},
			isHentai,
		},
		include: {
			chapters: {
				take: 1,
				orderBy: {
					id: 'desc'
				}
			}
		}
	});

	res.header('Content-Type', 'application/xml');
	res.send(`<?xml version="1.0" encoding="UTF-8"?>
		<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
		${books
			.map(book => {
				return `
					<url>
						<loc>${domain}/manga/${book.slug}</loc>
						<lastmod>${book.chapters.length ? moment(book.chapters[0].createdAt).format('YYYY-MM-DDTHH:mm:ssZ') : moment().format('YYYY-MM-DDTHH:00:00Z')}</lastmod>
						<priority>1</priority>
					</url>
				`;
			})
			.join('')}
		</urlset>
	`)
}

const getPages = async (req: Request, res: Response) => {
	const host = req.get('host');
	const domain = 'https://' + host;

	const pages = [
		{
			loc: domain,
			lastmod: moment().format('YYYY-MM-DDTHH:00:00Z'),
			changefreq: 'always',
			priority: 1,
		},
		{
			loc: `${domain}/manga`,
			lastmod: moment().format('YYYY-MM-DDTHH:00:00Z'),
			changefreq: 'always',
			priority: 1,
		},
	];

	res.header('Content-Type', 'application/xml');
	res.send(`<?xml version="1.0" encoding="UTF-8"?>
		<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
		${pages
			.map(page => {
				return `
					<url>
						<loc>${page.loc}</loc>
						<lastmod>${page.lastmod}</lastmod>
						<changefreq>${page.changefreq}</changefreq>
						<priority>${page.priority}</priority>
					</url>
				`;
			})
			.join('')}
		</urlset>
	`)
}

const getCollections = async (req: Request, res: Response) => {
	const domain = 'https://' + req.get('host');
	
	const collections = await prisma.collection.findMany({
		where: {
			isHentai: isHentai(req.get('host') || ''),
		},
	});

	res.header('Content-Type', 'application/xml');
	res.send(`<?xml version="1.0" encoding="UTF-8"?>
		<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
		${collections
			.map(collection => {
				return `
					<url>
						<loc>${domain}/collections/${collection.slug}</loc>
						<lastmod>${moment(collection.createdAt).format('YYYY-MM-DDTHH:mm:ssZ')}</lastmod>
						<priority>1</priority>
					</url>
				`;
			})
			.join('')}
		</urlset>
	`)
}

export default {
	getItems,
	getItem,
	getBooks,
	getPages,
	getCollections,
}