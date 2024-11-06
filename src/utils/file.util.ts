import { Effect } from 'effect'
import fs from 'fs'
import path from 'path'
import stream from 'stream'
import { FileHandler } from '../handlers'
import { main as logger } from './logger.util'

export const checkDir = (dir: string) =>
	Effect.gen(function* () {
		logger.verbose(`Checking dir ${dir}`)

		if (!fs.existsSync(dir)) {
			logger.info(`Making dir ${dir}`)
			yield* Effect.tryPromise({
				try: () =>
					new Promise<void>((resolve, reject) => {
						fs.mkdir(dir, { recursive: true }, (error) => {
							if (error) {
								reject(error)
							}

							resolve()
						})
					}),
				catch: (error) => new FileHandler.FileError(error)
			})
		}

		return dir
	})

export const read = (file: string) =>
	Effect.gen(function* () {
		logger.verbose(`Attempting to read ${file}`)
		yield* exists(file)

		return yield* Effect.tryPromise({
			try: () =>
				new Promise<string>((resolve, reject) => {
					const readStream = fs.createReadStream(file)
					let data = ''
					readStream.on('data', (chunk) => (data += chunk))
					readStream.on('end', () => resolve(data))
					readStream.on('error', (error) => reject(error))
				}),
			catch: (error) => new FileHandler.FileError(error)
		})
	})

export const write = (file: string, content: string) =>
	Effect.gen(function* () {
		logger.verbose(`Attempting to write ${file}`)

		yield* checkDir(path.dirname(file))

		yield* Effect.tryPromise({
			try: () => {
				return new Promise<void>((resolve, reject) => {
					const writeStream = fs.createWriteStream(file)
					const transformStream = new stream.Transform({
						transform(chunk, _, callback) {
							this.push(chunk)
							callback()
						}
					})

					writeStream.on('finish', () => {
						logger.info(`Writted file (${file})`)
						resolve()
					})
					writeStream.on('error', (error) => {
						logger.error(`Failed to write file ${file}`)
						reject(error)
					})

					transformStream.pipe(writeStream)
					transformStream.write(content)
					transformStream.end()
				})
			},
			catch: (error) => new FileHandler.FileError(error)
		})

		const time = new Date()
		fs.utimesSync(file, time, time)

		logger.verbose(`writted ${file}`)

		return file
	})

export const exists = (file: string) =>
	Effect.gen(function* () {
		if (fs.existsSync(file)) {
			return yield* Effect.succeed(file)
		}

		return yield* Effect.fail(new FileHandler.InexistentFileError(file))
	})

export const getStats = (file: string) =>
	Effect.gen(function* () {
		yield* exists(file)

		return yield* Effect.try({
			try: () => fs.statSync(file),
			catch: (error) => new FileHandler.FileError(error)
		})
	})
