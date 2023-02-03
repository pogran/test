import { EnEntity } from "#enums/EntityEnum";
import prisma from "#instances/prisma";
import { Serie, EnTagType, Genre, Tag } from "@prisma/client";
import { Request, Response } from "express";

export interface IntInclude {
	entities?: EnEntity[];
}

const index = async (req: Request, res: Response) => {
	const query = req.query as IntInclude;
	if (!query.entities) {
		return res.json([]);
	}
	let data: {tags?: Tag[], genres?: Genre[], persons?: Tag[], series?: Serie[]} = {};

	const getData = async (entity: EnEntity) => {
		switch (entity) {
			case EnEntity.GENRE: {
				return {
					genres: await prisma.genre.findMany({
						orderBy: {
							name: 'asc',
						}
					})
				}
			}

			case EnEntity.TAG:
			case EnEntity.PERSON:	
			{
				const propertyName = entity === EnEntity.TAG ? 'tags' : 'persons';
				return {
					[propertyName]: await prisma.tag.findMany({
						where: {
							type: entity === EnEntity.TAG ? EnTagType.GENERAL : EnTagType.COLLECTION
						},
						orderBy: {
							name: 'asc',
						}
					})
				}
			}

			case EnEntity.SERIE: {
				return {
					series: await prisma.serie.findMany({
						orderBy: {
							name: 'asc',
						}
					})
				}
			}

			default:
				return {}
		}
	}

	for (let i = 0; i < query.entities.length; i++) {
		const entity: EnEntity = query.entities[i];
		if (!Object.values(EnEntity).includes(entity)) {
			continue;
		}
		data = {...data, ...await getData(entity)}
	}
	res.json(data);
}

export default {
	index,
}