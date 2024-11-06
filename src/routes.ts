import { Express, Request, Response } from 'express'
import { validateMiddleware as validate, authMiddleware as auth } from './middlewares'
import { ArticleSchema, FeedSchema, LoginSchema, SourceSchema } from './schemas'
import {
	ArticleController,
	FeedController,
	SessionController,
	SourceController
} from './controllers'
import { metrics } from './utils'

export default (app: Express) => {
	// managment endpoints
	app.get('/healthcheck', (_, res: Response) => res.sendStatus(200))
	app.get('/metrics', metrics.response)

	// open endpoints
	app.get('/feed/:name', validate(FeedSchema.get), FeedController.getRssFeedHandler)
	app.get('/article/:uid', validate(ArticleSchema.getContent), ArticleController.getArticleHandler)

	// api endpoints
	app.use('/api', auth)
	// article
	app.post('/api/article/:id', validate(ArticleSchema.set), ArticleController.setArticleHandler)
	// source
	app.get('/api/sources', SourceController.getSourcesHandler)
	app.get('/api/articles', ArticleController.getArticlesHandler)
	app.post('/api/source/:id', validate(SourceSchema.set), SourceController.setSourceHandler)
	// feed
	app.get('/api/feeds', FeedController.getFeedsHandler)
	app.post('/api/feed', validate(FeedSchema.create), FeedController.createFeedHandler)
	app.post('/api/feed/:id', validate(FeedSchema.set), FeedController.setFeedHandler)
	app.delete('/api/feed/:id', validate(FeedSchema.remove), FeedController.removeFeedHandler)

	// dashboard rendering
	app.get('/', (_: Request, res: Response) => res.status(301).redirect('/dashboard'))
	app.get('/dashboard', auth, (_: Request, res: Response) => res.render('index'))
	app.get('/login', (_: Request, res: Response) => res.render('login'))
	app.post('/login', validate(LoginSchema.login), SessionController.loginHandler)
}
