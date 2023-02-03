import { Request, Response } from 'express';

const index = async (req: Request, res: Response) => {
	const host = req.get('host');
	const domain = 'https://' + host;
	res.header('Content-Type', 'text/plain');
  res.send(`User-agent: *\nDisallow: /api*\nDisallow: /_next*\nDisallow: /user*\nDisallow: /search*\nDisallow: /admin\nDisallow: /?*\n\nClean-param: comment&page\n\nHost: ${domain}\nSitemap: ${domain}/sitemap/index.xml`);
}

export default {
	index,
}