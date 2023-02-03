import prisma from "#instances/prisma";
import { Request, Response } from "express";

const bookmark = async (req: Request, res: Response) => {
	const bookId = +(req.query.bookId || '0');
	
	const bookmark = await prisma.bookmark.findFirst({
		where: {
			userId: req.userId,
			bookId,
		}
	});
	res.json(bookmark);
}

const bookmarks = async (req: Request, res: Response) => {
	const userId = req.userId;

	const bookmarks = await prisma.bookmark.findMany({
		where: {
			userId
		},
		include: {
			chapter: true,
			book: true,
		}
	});
  res.json(bookmarks);
}

export default {
	bookmarks,
	bookmark
}