import prisma from "#instances/prisma";
import { Request, Response } from "express";

const getItems = async (req: Request, res: Response) => {
	const series = await prisma.serie.findMany();

	return res.json(series);
}

const createItem = async (req: Request, res: Response) => {
	const name = req.body.name as string;

	const findSerie = await prisma.serie.findUnique({
		where: {
			name,
		}
	})

	if (findSerie) {
		return res.status(400).send({ error: 'Серия уже существует'});
	}

	const serie = await prisma.serie.create({
		data: {
			name,
		}
	})
	return res.json(serie);
}

export default {
	getItems,
	createItem,
}