import { __ } from "#helpers/i18n";

import prisma from "#instances/prisma";
import { Request, Response } from "express";
import { EnTagType } from '@prisma/client';

const getItems = async (req: Request, res: Response) => {
	const tags = await prisma.tag.findMany();

	return res.json(tags);
}

const createItem = async (req: Request, res: Response) => {
	const name = req.body.name as string;
	const serieId = req.body.serieId as number | null;

	if (serieId) {
		const findSerie = await prisma.serie.findUnique({
			where: {
				id: serieId,
			}
		});

		if (!findSerie) {
			return res.status(400).send({ error: 'Серия не существует'});
		}
	}

	const findTag = await prisma.tag.findUnique({
		where: {
			name_type: {
				name,
				type: EnTagType.COLLECTION
			}
		}
	});

	if (findTag) {
		return res.status(400).send({ error: 'Тег уже существует'});
	}

	const tag = await prisma.tag.create({
		data: {
			name,
			serieId,
			type: EnTagType.COLLECTION,
		}
	});

	return res.json(tag);
}

export default {
	createItem,
	getItems,
}