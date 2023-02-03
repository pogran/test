import { randomNameGenerator } from "#helpers/file.helper";
import ParserHttpService from "#services/ParserHttpService";
import { Request, Response } from "express";
import fs from 'fs';
import path from 'path';
import prisma from '#instances/prisma';


const addSocialImage = async (req: Request, res: Response) => {
	const {link} = req.body as {link: string};
	const userId = parseInt(req.params.userId || '0');
	const userPath = process.env.IMAGES_PATH + `/users/${userId}`;
	if (!fs.existsSync(userPath)){
		fs.mkdirSync(userPath, {recursive: true});
	}
	const image = await ParserHttpService.getImage(link);
	if (!image) {
		return res.json({});
	}
	let exc = path.extname(link).split("?").shift();
	if (!exc) {
		exc = '.png';
	}

	const name = randomNameGenerator(8) + exc;
	await fs.writeFileSync(`${userPath}/${name}`, image);

	await prisma.user.update({
		where: {
			id: userId,
		},
		data: {
			image: name,
		}
	});
	res.json({});
}

export default {
	addSocialImage,
}