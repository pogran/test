import { EnBookmarkType } from "@prisma/client";
import { Request, Response } from 'express';
import prisma from '#instances/prisma';
import { __ } from "#helpers/i18n";
import { isHentai } from "#helpers/index";
import moment from 'moment';

interface IntBookmark {
  userId: number
  bookId: number
  chapterId: number
  type: EnBookmarkType
  customTypeId: number | null
  isHentai: boolean
}

const getItems = async (req: Request, res: Response) => {
	const hentai = isHentai(req.get('host') || '');
	const userId = req.userId || 0;

	const bookmarks = await prisma.bookmark.findMany({
		where: {
			userId,
			isHentai: hentai,
		},
		include: {
			chapter: true,
			book: true,
		}
	});
	res.json(bookmarks);
}

const createItem = async (req: Request, res: Response) => {
	const data = req.body as IntBookmark;
	const bookmark = await prisma.bookmark.upsert({
		where: {
			userId_bookId: {
				userId: data.userId,
				bookId: data.bookId,
			}
		},
		update: {
			chapterId: data.chapterId,
		},
		create: data,
	});

	await prisma.bookStat.update({
		where: {
			bookId: data.bookId,
		},
		data: {
			countBookmarks: {increment: 1}
		}
	});

	const date = new Date(moment().format('YYYY-MM-DD'));
	await prisma.bookAnalytic.upsert({
		where: {
			bookId_date: {
				bookId: data.bookId,
				date,
			},
		},
		update: {
			bookmarks: {
				increment: 1
			}
		},
		create: {
			bookId: data.bookId,
			bookmarks: 1,
			date,
		}
	});

	res.json(bookmark);
}

const moveItems = async (req: Request, res: Response) => {
	const data = req.body as {ids: number[], type: EnBookmarkType};
	const userId = req.userId || 0;

	await prisma.bookmark.updateMany({
		where: {
			id: {
				in: data.ids,
			},
			userId,
		},
		data: {
			type: data.type,
		}
	});
	res.json([]);
}

const updateItem = async (req: Request, res: Response) => {
	const bookmarkId = +req.params.id;
	const data = req.body as Partial<IntBookmark>;
	const userId = req.userId || 0;

	const findBookmark = await prisma.bookmark.findUnique({
		where: {
			id: bookmarkId,
		}
	});

	if (!findBookmark || findBookmark.userId !== userId) {
		return res.status(400).send({ error: 'Закладка не найдена'});
	}

	const bookmark = await prisma.bookmark.update({
		where: {
			id: bookmarkId,
		},
		data,
	});
	res.json(bookmark);
}

const deleteItems = async (req: Request, res: Response) => {
	const data = req.body as {ids: number[]};
	const userId = req.userId || 0;

	for (let i = 0; i < data.ids.length; i++) {
		// also we can add transaction
		const bookmarkId = data.ids[i];
		const bokmark = await prisma.bookmark.findUnique({
			where: {
				id: bookmarkId,
			}
		});
		if (!bokmark || bokmark.userId !== userId) {
			continue;
		}

		await prisma.bookStat.update({
			where: {
				bookId: bokmark.bookId,
			},
			data: {
				countBookmarks: {decrement: 1}
			}
		});

		const date = new Date(moment().format('YYYY-MM-DD'));
		await prisma.bookAnalytic.upsert({
			where: {
				bookId_date: {
					bookId: bokmark.bookId,
					date,
				},
			},
			update: {
				bookmarks: {
					decrement: 1
				}
			},
			create: {
				bookId: bokmark.bookId,
				bookmarks: -1,
				date,
			}
		});
	}

	await prisma.bookmark.deleteMany({
		where: {
			id: {
				in: data.ids,
			},
			userId
		}
	});

	res.json([]);
}

const deleteItem = async (req: Request, res: Response) => {
	const bookmarkId = +req.params.id;
	const userId = req.userId || 0;

	const findBookmark = await prisma.bookmark.findUnique({
		where: {
			id: bookmarkId,
		}
	});

	if (!findBookmark || findBookmark.userId !== userId) {
		return res.status(400).send({ error: 'Закладка не найдена'});
	}

	await prisma.bookmark.delete({
		where: {
			id: bookmarkId,
		},
	});

	await prisma.bookStat.update({
		where: {
			bookId: findBookmark.bookId
		},
		data: {
			countBookmarks: {decrement: 1}
		}
	});

	res.json(null);
}

export default {
	getItems,
	createItem,
	updateItem,
	deleteItem,

	moveItems,
	deleteItems,
}