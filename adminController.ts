import { Request, Response } from 'express';
import prisma from '#instances/prisma';
import { __ } from '../helpers/i18n';
import fs from 'fs';
import { IntJsonBook } from 'types/parser';
import ParserBookService from '#services/ParserBookService';
import _isEmpty from 'lodash/isEmpty';
import BookService from '#services/BookService';
import { EnChapterStatus } from '@prisma/client';

const rebuild = async (req: Request, res: Response) => {
	const chapterId = Number(req.params.chapterId) || 0;

	const chapter = await prisma.chapter.findUnique({
		where: {
			id: chapterId,
		},
		include: {
			book: true,
			parserChapter: {
				include: {
					parserBook: true,
				}
			}
		}
	});

	if (!chapter?.parserChapter?.parserBook) {
		res.statusCode = 404;
		return res.json({
			error: __('Глава не найдена или не все данные найдены'),
		});
	}

	const chapterPath = process.env.IMAGES_PATH + `/slides/${chapter.book.id}/${chapterId}`;
	fs.rmSync(chapterPath, { recursive: true, force: true });
	
	await prisma.slide.deleteMany({
		where: {
			chapterId,
		}
	});

	const parserBook = chapter.parserChapter.parserBook;
	const parserChapter = chapter.parserChapter;
	const bookPath = `${process.env.PARSERS_DATA_PATH}/${parserBook.source.toLocaleLowerCase()}/json/${parserBook.originalId}.json`;

	if (!fs.existsSync(bookPath)) {
		res.statusCode = 400;
		return res.json({
			error: __(`Файл контента не найден ${bookPath}`),
		});
	}

	const content = JSON.parse(fs.readFileSync(bookPath) as any) as IntJsonBook;
	const jsonChapterIndex = content.chapters.findIndex(c => c.id === parserChapter.originalId);

	if (jsonChapterIndex === -1) {
		res.statusCode = 400;
		return res.json({
			error: __(`Глава не найдена в json. ID главы в json ${parserChapter.originalId}`),
		});
	}

	const slides = content.chapters[jsonChapterIndex].slides;

	const {uploadedSlides, errors} = await ParserBookService.uploadSlides(slides, parserBook.source, chapterId, chapter.book.id); 

	if (!_isEmpty(errors)) {
		res.statusCode = 400;
		return res.json({
			error: errors,
		});
	}
	await BookService.addSlides(uploadedSlides);

	chapter.status !== EnChapterStatus.ACTIVE && 
		await prisma.chapter.update({
			where: {
				id: chapterId,
			},
			data: {
				status: EnChapterStatus.ACTIVE
			}
		});

	res.json({
		message: __(`Загружено ${uploadedSlides.length} слайдов`)
	});
}

export default {
	rebuild,
}