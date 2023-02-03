import { BOOKS_COUNT_DESK, BOOKS_COUNT_MOBILE } from "#config/index";
import { isMobile } from "#helpers/index";
import prisma from "#instances/prisma";
import { Request, Response } from "express";

const getItem = async (req: Request, res: Response) => {
	const slug = req.params.slug || '';
	const mobile = isMobile(req.get('user-agent') || '');

	const collectionData = await prisma.collection.findUnique({
		where: {
			slug,
		},
		include: {
			parentCollection: true
		}
	});

	if (!collectionData) {
		return res.json({collection: null, relatives: [], books: []});
	}

	const parentCollectionId = collectionData.parentCollectionId ?? collectionData.id;
	let relatives = await prisma.collection.findMany({
		where: {
			parentCollectionId,
		}
	});

	!collectionData.parentCollection ?
		relatives.unshift(collectionData) :
		relatives.unshift(collectionData.parentCollection);

	const limit = mobile ? BOOKS_COUNT_MOBILE : BOOKS_COUNT_DESK;

	const collectionBooks = await prisma.collectionBook.findMany({
		where: {
			collectionId: collectionData.id,
		},
		take: limit,
		include: {
			book: true,
		}
	});
	const books = collectionBooks.map(c => c.book);
	const {parentCollection, ...collection} = collectionData;

	return res.json({collection, relatives, books});
}

const getItems = async (req: Request, res: Response) => {
	const collections = await prisma.collection.findMany();

	return res.json(collections);
}

const getBooks = async (req: Request, res: Response) => {
	const mobile = isMobile(req.get('user-agent') || '');
	const limit = mobile ? BOOKS_COUNT_MOBILE : BOOKS_COUNT_DESK
	const page = Number(req.query.page);
	const id = parseInt(req.params.id, 10);
	
	const collectionBooks = await prisma.collectionBook.findMany({
		where: {
			collectionId: id,
		},
		skip: (page - 1) * limit,
		take: limit,
		include: {
			book: true,
		}
	})
	res.json(collectionBooks.map(coll => coll.book));
}

export default {
	getItem,
	getItems,
	getBooks,
}