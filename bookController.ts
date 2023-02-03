import { Request, Response } from 'express';
import prisma from '#instances/prisma';
import { __ } from "#helpers/i18n";
import { isHentai, isMobile } from '#helpers/index';
import { CATALOG_BOOKS_COUNT_MOBILE, CATALOG_BOOKS_COUNT_DESK, DEFAULT_BOOKS_ORDER_BY, DEFAULT_BOOKS_SORT } from '#config/index';
import { Book, Bookmark, EnBookStatus, EnBookType } from '@prisma/client';
import _isArray from 'lodash/isArray';
import _has from 'lodash/has';
import { EnBookOrderBy } from '#enums/BookOrderByEnum';
import { EnSort } from '#enums/SortEnum';
import _isEmpty from 'lodash/isEmpty';
import intersection from 'lodash/intersection';

interface IntSearch {
	types?: string | string[];
	genres?: string | string[];
	tags?: string | string[];
	persons?: string | string[];
	serie?: string;
	orderBy?: string;
}

export interface IntFilters {
	types?: string | string[];
	genres?: string | string[];
	tags?: string | string[];
	persons?: string | string[];
	serie?: string;
}

export interface IntFilterData {
	types?: EnBookType[] | null;
	genres?: number[] | null;
	tags?: number[] | null;
	persons?: number[] | null;
	serie?: number | null;
}

const getItem = async (req: Request, res: Response) => {
	const slug = req.params.slug || '';

	const book = await prisma.book.findUnique({
		where: {
			slug,
		},
	});

	res.json(book);
}

const getItems = async (req: Request, res: Response) => {
	const searchParams = req.query as IntSearch;
	const userId = req.userId || 0;

	const {orderBy, sort, ...searchFilterParams} = searchParams && _has(searchParams, 'orderBy')
	? {
			...searchParams,
			orderBy: searchParams.orderBy?.replace('-', '') as EnBookOrderBy || DEFAULT_BOOKS_ORDER_BY,
			sort: searchParams.orderBy?.includes('-') ? EnSort.DESC : EnSort.ASC,
		} 
	: {
		...searchParams,
		orderBy: DEFAULT_BOOKS_ORDER_BY,
		sort: DEFAULT_BOOKS_SORT,
	};

	const getOrderBy = () => {
		switch (orderBy) {
			case EnBookOrderBy.BOOKMARKS: {
				return [{
					bookStat: {
						countBookmarks: sort,
					}
				}];
			}

			case EnBookOrderBy.VIEWS: {
				return [{
					bookStat: {
						countViews: sort,
					}
				}];
			}

			case EnBookOrderBy.LIKES: {
				return [{
					bookStat: {
						countLikes: sort,
					}
				}];
			}

			case EnBookOrderBy.NEW:
			case EnBookOrderBy.UPDATE:
			default:
				return {
					[orderBy]: sort,
				};
		}
	};

	const getFiltersData = (params: IntFilters): IntFilterData => {
		const data: IntFilterData = {};

		Object.keys(params).map(key => {
			switch (key) {
				case 'types': {
					data.types = Array.isArray(params[key]) ?
						(params[key] as string[]).map(v => v as EnBookType) : [params[key] as EnBookType];
					return key;
				}

				case 'serie': {
					data.serie = Number(params[key]);
					return key;
				}
				case 'persons':
				case 'tags':
				case 'genres': {
					data[key] = Array.isArray(params[key]) ?
						(params[key] as string[]).map(v => Number(v)) : [Number(params[key])];
					return key;
				}
				default: {
					return key;
				}
			}
		});

		return data;
	};
	const filtersData = getFiltersData(searchFilterParams);
	const getTags = () => {
		let tags: number[] = [];
		if (filtersData.tags) {
			tags = [...tags, ...filtersData.tags];
		}
		if (filtersData.persons) {
			tags = [...tags, ...filtersData.persons];
		}
		return tags;
	};
	

	const page = Number(req.query.page) || 1;
	const mobile = isMobile(req.get('user-agent') || '');
	const limit = mobile ? CATALOG_BOOKS_COUNT_MOBILE : CATALOG_BOOKS_COUNT_DESK;

	const filterBookGenres = async (genres: number[]) => {
		const genreGroups = await prisma.bookGenre.groupBy({
			by: ['bookId'],
			where: {
				genreId: {
					in: genres
				},
			},
			orderBy: {
				bookId: 'desc'
			},
			having: {
				bookId: {
					_count: {
						equals: genres.length,
					}
				}
			},
		});
		return genreGroups.map(b => b.bookId);
	};

	const filterBookTags = async (tagIds: number[]) => {
		const tagGroups = await prisma.bookTag.groupBy({
			by: ['bookId'],
			where: {
				tagId: {
					in: tagIds
				},
			},
			orderBy: {
				bookId: 'desc'
			},
			having: {
				bookId: {
					_count: {
						equals: tagIds.length,
					}
				}
			},
		});
		return tagGroups.map(b => b.bookId);
	};
	const bookIdGenres = filtersData.genres ? await filterBookGenres(filtersData.genres) : [];
	const tags = getTags();
	const bookIdTags = !_isEmpty(tags) ? await filterBookTags(tags) : [];
	const bookIds = !_isEmpty(tags) && filtersData.genres ? intersection(bookIdGenres, bookIdTags) : (
		(_isEmpty(tags) && !filtersData.genres ? undefined : (
			filtersData.genres ? bookIdGenres : bookIdTags
		))
	);

	const books = await prisma.book.findMany({
		where: {
			id: bookIds ? {
				in: bookIds
			} : undefined,
			status: {
				not: EnBookStatus.DRAFT
			},
			isHentai: isHentai(req.get('host') || ''),
			serieBooks: filtersData.serie ? {
				some: {
					serieId: filtersData.serie,
				}
			} : undefined,
			type: filtersData.types ? {
				in: filtersData.types.map(t => t.toUpperCase() as EnBookType)
			} : undefined,
		},
		include: userId ? {
			bookmarks: {
				where: {
					userId,
				}
			},
		} : undefined,
		orderBy: getOrderBy(),
		take: limit,
		skip: (page - 1) * limit,
	});

	res.json(books.map(b => {
		const {bookmarks = [], ...book} = b as Book & {bookmarks?: Bookmark[]};
		return {...book, bookmark: _isEmpty(bookmarks) ? null : bookmarks[0]};
	}));
}

const getBookmark = async (req: Request, res: Response) => {
	const bookId = +(req.params.bookId || '0');
	const userId = req.userId || 0;
	const includes = req.query.includes || '';

	const bookmark = await prisma.bookmark.findUnique({
		where: {
			userId_bookId: {
				userId,
				bookId
			}
		},
		include: includes === 'chapter' ? {
			chapter: true,
		} : undefined
	});

	res.json(bookmark);
}


const getCollections = async (req: Request, res: Response) => {
	const bookId = +(req.params.bookId || '0');

	const collections = await prisma.collectionBook.findMany({
		where: {
			bookId,
		},
		include: {
			collection: true,
		}
	});

	res.json(collections.map(col => col.collection));
}

const createCollections = async (req: Request, res: Response) => {
	const bookId = +(req.params.bookId || '0');
	const ids = req.body.ids as number[];

	const data = [];
	for (let i = 0; i < ids.length; i++) {
		data.push({bookId, collectionId: ids[i]});
	}

	await prisma.collectionBook.createMany({
		data,
	});

	res.json([]);
}

const deleteCollections = async (req: Request, res: Response) => {
	const bookId = +(req.params.bookId || '0');
	const ids = req.body as number[];

	await prisma.collectionBook.deleteMany({
		where: {
			bookId,
			collectionId: {
				in: ids,
			}
		},
	});
	res.json([]);
}

const getSeries = async (req: Request, res: Response) => {
	const bookId = +(req.params.bookId || '0');

	const series = await prisma.serieBook.findMany({
		where: {
			bookId,
		},
		include: {
			serie: true,
		}
	});

	res.json(series.map(col => col.serie));
}

const createSeries = async (req: Request, res: Response) => {
	const bookId = +(req.params.bookId || '0');
	const ids = req.body.ids as number[];

	const data = [];
	for (let i = 0; i < ids.length; i++) {
		data.push({bookId, serieId: ids[i]});
	}

	await prisma.serieBook.createMany({
		data,
	});
	res.json([]);
}

const deleteSeries = async (req: Request, res: Response) => {
	const bookId = +(req.params.bookId || '0');
	const ids = req.body as number[];

	await prisma.serieBook.deleteMany({
		where: {
			bookId,
			serieId: {
				in: ids,
			}
		},
	});
	res.json([]);
}

const getTags = async (req: Request, res: Response) => {
	const bookId = +(req.params.bookId || '0');

	const tags = await prisma.bookTag.findMany({
		where: {
			bookId,
		},
		include: {
			tag: true,
		}
	});

	res.json(tags.map(tag => tag.tag));
}

const createTags = async (req: Request, res: Response) => {
	const bookId = +(req.params.bookId || '0');
	const ids = req.body.ids as number[];

	const data = [];
	for (let i = 0; i < ids.length; i++) {
		const tag = await prisma.bookTag.findUnique({
			where: {
				bookId_tagId: {
					bookId,
					tagId: ids[i],
				}
			}
		});

		if (tag) {
			return res.status(400).send({ error: 'Такой тег уже существует в этой книге'});
		}

		data.push({bookId, tagId: ids[i]});
	}

	await prisma.bookTag.createMany({
		data,
	});

	res.json([]);
}

const deleteTags = async (req: Request, res: Response) => {
	const bookId = +(req.params.bookId || '0');
	const ids = req.body as number[];

	await prisma.bookTag.deleteMany({
		where: {
			bookId,
			tagId: {
				in: ids,
			}
		},
	});
	res.json([]);
}

export default {
	getItem,
	getItems,

	getBookmark,

	getCollections,
	createCollections,
	deleteCollections,

	getSeries,
	createSeries,
	deleteSeries,

	getTags,
	createTags,
	deleteTags,
}