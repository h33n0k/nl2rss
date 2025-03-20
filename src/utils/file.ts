import fs from 'fs'
import path from 'path'
import stream from 'stream'

import { Effect } from 'effect'

import * as FileHandler from '../handlers/file'
import logger from './logger'

/**
 * A utility function to check the accessibility of a given file/directory by verifying if it exists
 * and if the current process has read and write permissions.
 *
 * @param file - The file/directory path to check. Must be a valid path string.
 *
 * @returns An `Effect` that yields the directory path if the file exists and is accessible.
 *
 * @throws AccessError - If there is an issue with accessing the file, such as lack of permissions or non-existence of the directory.
 *
 * @example
 * const checkDirectory = checkFile('/path/to/dir');
 *
 * checkDirectory.pipe(Effect.runPromise).then((dir) => {
 *   console.log(`Directory is accessible: ${dir}`); // '/path/to/dir'
 * }).catch((error) => {
 *   console.error(error); // Handles AccessError
 * });
 *
 * @example
 * // Handling errors explicitly:
 * checkDirectory.pipe(
 *   Effect.catchAll((error) => Effect.succeed(`Error occurred: ${error.message}`)),
 *   Effect.runPromise
 * ).then(console.log);
 */
export const checkFile = (file: string) =>
	Effect.gen(function* () {
		logger.debug(`Checking file ${file}`)

		yield* Effect.tryPromise({
			try: () =>
				new Promise((resolve, reject) => {
					fs.access(
						file,
						fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK, // Ensure read/write permissions
						(error) => {
							if (error) {
								return reject(error)
							}

							resolve(file)
						}
					)
				}),
			catch: (error) => new FileHandler.AccessError(error, file, 'ACCESS')
		})

		return file
	}).pipe(
		Effect.catchAll((error) => {
			logger.debug(`${error.title}, ${error.message}`)
			return error
		})
	)

/**
 * A utility function to create a directory at a specified path, ensuring that all intermediate directories
 * are also created if they do not exist.
 *
 * @param dir - The directory path to create. Must be a valid directory path string.
 *
 * @returns An `Effect` that yields the directory path if the directory was successfully created.
 *
 * @throws AccessError - If there is an issue with creating the directory, such as lack of permissions or other file system errors.
 *
 * @example
 * const createDirectory = makeDir('/path/to/dir');
 *
 * createDirectory.pipe(Effect.runPromise).then((dir) => {
 *   console.log(`Directory created: ${dir}`); // '/path/to/dir'
 * }).catch((error) => {
 *   console.error(error); // Handles AccessError
 * });
 *
 * @example
 * // Handling errors explicitly:
 * createDirectory.pipe(
 *   Effect.catchAll((error) => Effect.succeed(`Error occurred: ${error.message}`)),
 *   Effect.runPromise
 * ).then(console.log);
 */
export const makeDir = (dir: string) =>
	Effect.gen(function* () {
		logger.debug(`Making dir ${dir}`)

		yield* Effect.tryPromise({
			try: () =>
				new Promise((resolve, reject) => {
					fs.mkdir(dir, { recursive: true }, (error) => {
						if (error) {
							return reject(error)
						}

						resolve(dir)
					})
				}),
			catch: (error) => new FileHandler.AccessError(error, dir, 'MKDIR')
		})

		logger.debug(`Writted ${dir}`)
		return dir
	}).pipe(
		Effect.catchAll((error) => {
			logger.debug(`${error.title}, ${error.message}`)
			return error
		})
	)

/**
 * A utility function to write content to a specified file. If the directory does not exist,
 * it attempts to create the necessary directories before writing the file.
 *
 * @param file - The file path where the content should be written. Must be a valid file path string.
 * @param content - The content to write to the file. Must be a string.
 *
 * @returns An `Effect` that yields the file path once the content has been successfully written.
 *
 * @throws AccessError - If there is an issue with accessing or writing to the file, such as lack of permissions or other file system errors.
 *
 * @example
 * const writeFile = write('/path/to/file.txt', 'Hello, world!');
 *
 * writeFile.pipe(Effect.runPromise).then((file) => {
 *   console.log(`File written: ${file}`); // '/path/to/file.txt'
 * }).catch((error) => {
 *   console.error(error); // Handles AccessError
 * });
 *
 * @example
 * // Handling errors explicitly:
 * writeFile.pipe(
 *   Effect.catchAll((error) => Effect.succeed(`Error occurred: ${error.message}`)),
 *   Effect.runPromise
 * ).then(console.log);
 */
export const write = (file: string, content: string) =>
	checkFile(path.dirname(file)).pipe(
		Effect.matchEffect({
			onSuccess: (dir) => Effect.succeed(dir),
			onFailure: (error) => {
				if (error.code === 'ENOENT') {
					return makeDir(error.file)
				}

				return Effect.fail(error)
			}
		}),
		Effect.flatMap(() =>
			Effect.gen(function* () {
				logger.debug(`Writting ${file}`)

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

							writeStream.on('finish', () => resolve())
							writeStream.on('error', (error) => {
								reject(error)
							})
							transformStream.pipe(writeStream)
							transformStream.write(content)
							transformStream.end()
						})
					},
					catch: (error) => new FileHandler.AccessError(error, file, 'WRITE')
				})

				logger.debug(`Writted ${file}`)
				return file
			}).pipe(
				Effect.catchAll((error) => {
					logger.debug(`${error.title}, ${error.message}`)
					return error
				})
			)
		)
	)

/**
 * Reads the content of a specified file
 *
 * @param file - The path to the file to be read.
 *
 * @returns An `Effect` that resolves to the file content as a string.
 *
 * @throws AccessError - If an issue occurs while accessing the file.
 *
 * @example
 * const readFile = read('/path/to/file.html');
 *
 * readFile.pipe(Effect.runPromise).then((content) => {
 *   console.log(`File content: ${content}`);
 * }).catch((error) => {
 *   console.error(error); // Handles AccessError
 * });
 *
 * @example
 * // Handling errors explicitly:
 * read('/path/to/file.html').pipe(
 *   Effect.catchAll((error) => Effect.succeed(`Error reading file: ${error.message}`)),
 *   Effect.runPromise
 * ).then(console.log);
 */
export const read = (file: string) =>
	Effect.gen(function* () {
		logger.debug(`Reading ${file}`)

		return yield* Effect.tryPromise({
			try: () =>
				new Promise<string>((resolve, reject) => {
					const stream = fs.createReadStream(file)

					let data = ''
					stream.on('data', (chunk) => (data += chunk))
					stream.on('end', () => resolve(data))
					stream.on('error', (error) => reject(error))
				}),
			catch: (error) => new FileHandler.AccessError(error, file, 'READ')
		})
	}).pipe(
		Effect.catchAll((error) => {
			logger.debug(`${error.title}, ${error.message}`)
			return error
		})
	)

// export const stat = (f: string) =>
// 	checkFile(f).pipe(
// 		Effect.flatMap((file) =>
// 			Effect.tryPromise({
// 				try: () => new Promise<fs.Stats>((resolve, reject) =>
// 					fs.stat(file, (error, stats) => {
// 						if (error) return reject(error)
// 						resolve(stats)
// 					})
// 				),
// 				catch: (error) => new FileHandler.AccessError(error, file, 'ACCESS')
// 			})
// 		)
// 	)
