import prisma from "#instances/prisma";
import { EnBookStatus } from "@prisma/client";
import { Request, Response } from "express";
import { isMobile } from '#helpers/index';
import { BOOKS_COUNT_DESK, BOOKS_COUNT_MOBILE } from "#config/index";

const index = async (req: Request, res: Response) => {
	const query = (req.query.query as string).trim();
	const mobile = isMobile(req.get('user-agent') || '');
	const page = Number(req.query.page) || 1;
	const limit = mobile ? BOOKS_COUNT_MOBILE : BOOKS_COUNT_DESK;

	const books = await prisma.book.findMany({
		where: {
			status: {
				not: EnBookStatus.DRAFT,
			},
			OR: [
				{
					title: {
						contains: query
					}
				},
				{
					titleEn: {
						contains: query
					}
				},
			],
		},
		skip: (page - 1) * limit,
		take: limit,
		orderBy: {
			title: 'asc'
		},
		include: {
			lastUploadChapter: true,
		}
	});
	res.json(books);
}

export default { 
	index,
}