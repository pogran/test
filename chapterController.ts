import { Request, Response } from 'express';
import prisma from '#instances/prisma';
import { __ } from "#helpers/i18n";
import { CHAPTERS_COUNT } from "#config/index";
// import moment from 'moment'

const getItem = async (req: Request, res: Response) => {
	const userId = req.userId || 0;

	const chapterData = await prisma.chapter.findFirst({
		where: {
			id: parseInt(req.params.id, 10),
		},
		include: {
			book: true,
			slides: true,
			chapterLikes: userId ? {
				where: {
					userId
				}
			} : undefined,
		}
	});

	if (!chapterData) {
		return res.status(400).send('Глава не найдена.');
	}

	const {book, slides, chapterLikes, ...chapter} = chapterData;

	const nextChapter = await prisma.chapter.findFirst({
		where: {
			bookId: chapter.bookId,
			index: {
				gt: chapter.index,
			}
		},
		orderBy: {
			index: 'asc',
		}
	});
  res.json({chapter, chapterLikes, book, slides, nextChapter});
}

const getItems = async (req: Request, res: Response) => {
	const count = CHAPTERS_COUNT;
	const includes = req.query.includes;

	const bookId = +String(req.query.bookId);
	const page = +String(req.query.page || '0');
	const userId = req.userId || 0;
	
	const chapters = page !== 0 ? await prisma.chapter.findMany({
		where: {
			bookId,
		},
		include: includes === 'chapterLikes' && userId ? {
			chapterLikes: {
				take: 1,
				where: {
					userId,
				}
			}
		} : undefined,
		orderBy: {
			id: 'desc',
		},
		take: count,
		skip: (page - 1) * count,
	}) : await prisma.chapter.findMany({
		where: {
			bookId,
		},
		include: includes === 'chapterLikes' && userId ? {
			chapterLikes: {
				take: 1,
				where: {
					userId,
				}
			}
		} : undefined,
		orderBy: {
			id: 'desc',
		},
	})
	res.json(chapters);
}

const getBookmark = async (req: Request, res: Response) => {
	const bookId = +(req.params.chapterId || '0');
	const userId = req.userId || 0;

	const bookmark = await prisma.bookmark.findUnique({
		where: {
			userId_bookId: {
				userId,
				bookId
			}
		}
	});

	res.json(bookmark);
}

const addLike = async (req: Request, res: Response) => {
	const chapterId = +(req.params.chapterId || '0');
	const userId = req.userId || 0;

	const findChapterLike = await prisma.chapterLike.findUnique({
		where: {
			chapterId_userId: {
				chapterId,
				userId,
			}
		}
	});

	if (findChapterLike) {
		return res.status(400).send({ error: 'Вы уже поставили лайк этой главе'});
	}

	const chapterLike = await prisma.chapterLike.create({
		data: {
			chapterId,
			userId,
		}
	});

	await prisma.chapter.update({
		where: {
			id: chapterId,
		},
		data: {
			likes: {
				increment: 1
			}
		}
	});
	res.json(chapterLike);
}

export default {
	getItem,
	getItems,
	getBookmark,

	addLike,
}