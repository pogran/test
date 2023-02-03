import { UPDATES_COUNT } from "#config/index";
import prisma from "#instances/prisma";
import { EnBookStatus } from "@prisma/client";
import { Request, Response } from "express";
import { isHentai } from '#helpers/index';

const getItems = async (req: Request, res: Response) => {
	const page = Number(req.query.page) || 0;

	const books = await prisma.book.findMany({
		where: {
			status: {
				not: EnBookStatus.DRAFT
			},
			isHentai: isHentai(req.get('host') || ''),
		},
    take: UPDATES_COUNT,
    skip: Math.abs(page - 1) * UPDATES_COUNT,
		orderBy: {
			newUploadAt: 'desc'
		},
		include: {
			lastUploadChapter: true,
		}
	});

	res.json(books);
}

export default {
	getItems,
}