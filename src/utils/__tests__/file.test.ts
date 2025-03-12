import fs, { MakeDirectoryOptions, NoParamCallback, PathLike } from 'fs'
import path from 'path'

import { Effect } from 'effect'
import { faker } from '@faker-js/faker'

import * as FileHandler from '../../handlers/file'
import * as fileUtil from '../file'

jest.mock('../logger')
jest.mock('fs')

const mockedDir = '/mocked-directory'
const mockedFile = path.join(mockedDir, 'mocked-file.txt')

describe('utils/file', () => {
	describe('`checkDir` method', () => {
		describe('Return value', () => {
			it('should returns the specified path', async () => {
				;(fs.access as unknown as jest.Mock).mockImplementation(
					(
						_path: PathLike,
						_mode: number | undefined,
						callback: NoParamCallback
					) => {
						callback(null)
					}
				)

				await fileUtil.checkDir(mockedDir).pipe(
					Effect.match({
						onFailure: () => {
							throw new Error('Expected the effect to pass.')
						},
						onSuccess: (value) => {
							expect(value).toBeDefined()
							expect(typeof value).toBe('string')
							expect(value).toBe(mockedDir)
						}
					}),
					Effect.runPromise
				)

				expect(fs.access).toHaveBeenCalled()
				expect(fs.access).toHaveBeenCalledWith(
					mockedDir,
					6,
					expect.any(Function)
				)
			})
		})

		describe('Error handling', () => {
			const cases = new Map<string, { tag: unknown }>()

			cases.set('ENOENT', { tag: FileHandler.AccessError }) // Inexistant file or directory
			cases.set('EACCESS', { tag: FileHandler.AccessError }) // Permission denied
			cases.set('ENOTDIR', { tag: FileHandler.AccessError }) // Not a directory
			cases.set('EMFILE', { tag: FileHandler.AccessError }) // File table overflow
			cases.set('ENOSPC', { tag: FileHandler.AccessError }) // No space available

			for (const [key, mocked] of cases.entries()) {
				it(`should handle '${key}' error`, async () => {
					;(fs.access as unknown as jest.Mock).mockImplementation(
						(
							_path: PathLike,
							_mode: number | undefined,
							callback: NoParamCallback
						) => {
							callback(
								Object.assign(new Error('mocked error message.'), { code: key })
							)
						}
					)

					await fileUtil.checkDir(mockedDir).pipe(
						Effect.match({
							onFailure: (error) => {
								expect(error).toBeDefined()
								expect(error).toBeInstanceOf(mocked.tag)
								expect(error.code).toBeDefined()
								expect(error.code).toBe(key)
							},
							onSuccess: () => {
								throw new Error('Expected the effect to fail.')
							}
						}),
						Effect.runPromise
					)

					expect(fs.access).toHaveBeenCalled()
					expect(fs.access).toHaveBeenCalledWith(
						mockedDir,
						6,
						expect.any(Function)
					)
				})
			}
		})
	})

	describe('`makeDir` method', () => {
		describe('Return value', () => {
			it('should returns the specified path', async () => {
				;(fs.mkdir as unknown as jest.Mock).mockImplementation(
					(
						_path: PathLike,
						_options: MakeDirectoryOptions,
						callback: NoParamCallback
					) => {
						callback(null)
					}
				)

				await fileUtil.makeDir(mockedDir).pipe(
					Effect.match({
						onFailure: () => {
							throw new Error('Expected the effect to pass.')
						},
						onSuccess: (value) => {
							expect(value).toBeDefined()
							expect(typeof value).toBe('string')
							expect(value).toBe(mockedDir)
						}
					}),
					Effect.runPromise
				)

				expect(fs.mkdir).toHaveBeenCalled()
				expect(fs.mkdir).toHaveBeenCalledWith(
					mockedDir,
					{ recursive: true },
					expect.any(Function)
				)
			})
		})

		describe('Error handling', () => {
			const cases = new Map<string, { tag: unknown }>()

			cases.set('ENOENT', { tag: FileHandler.AccessError }) // Inexistant file or directory
			cases.set('EEXIST', { tag: FileHandler.AccessError }) // Already exists
			cases.set('EACCESS', { tag: FileHandler.AccessError }) // Permission denied
			cases.set('ENOTDIR', { tag: FileHandler.AccessError }) // Not a directory
			cases.set('EMFILE', { tag: FileHandler.AccessError }) // File table overflow
			cases.set('ENOSPC', { tag: FileHandler.AccessError }) // No space available

			for (const [key, mocked] of cases.entries()) {
				it(`should handle '${key}' error`, async () => {
					;(fs.mkdir as unknown as jest.Mock).mockImplementation(
						(
							_path: PathLike,
							_options: MakeDirectoryOptions,
							callback: NoParamCallback
						) => {
							callback(
								Object.assign(new Error('mocked error message.'), { code: key })
							)
						}
					)

					await fileUtil.makeDir(mockedDir).pipe(
						Effect.match({
							onFailure: (error) => {
								expect(error).toBeDefined()
								expect(error).toBeInstanceOf(mocked.tag)
								expect(error.code).toBeDefined()
								expect(error.code).toBe(key)
							},
							onSuccess: () => {
								throw new Error('Expected the effect to fail.')
							}
						}),
						Effect.runPromise
					)

					expect(fs.mkdir).toHaveBeenCalled()
					expect(fs.mkdir).toHaveBeenCalledWith(
						mockedDir,
						{ recursive: true },
						expect.any(Function)
					)
				})
			}
		})
	})

	describe('`write` method', () => {
		describe('Return value', () => {
			it('should returns the specified path', async () => {
				jest
					.spyOn(fileUtil, 'checkDir')
					.mockImplementation((dir: string) => Effect.succeed(dir))

				const mockedWriteStream = new (require('stream').Writable)()

				mockedWriteStream._write = jest.fn((_, __, cb) => cb())
				;(fs.createWriteStream as jest.Mock).mockReturnValue(mockedWriteStream)

				const result = await fileUtil
					.write(mockedFile, faker.lorem.paragraph())
					.pipe(Effect.runPromise)

				expect(result).toBeDefined()
				expect(result).toBe(mockedFile)
				expect(fs.createWriteStream).toHaveBeenCalledWith(mockedFile)
			})
		})

		describe('Error handling', () => {
			const cases = new Map<
				string,
				{
					writeCalled: boolean
					checkDir?: { code: string }
					makeDir?: { code: string }
					write?: { code: string }
				}
			>()

			cases.set('directory permission denied', {
				writeCalled: false,
				checkDir: { code: 'EACCESS' }
			})
			cases.set('failed to create the parent directory', {
				writeCalled: false,
				checkDir: { code: 'ENOENT' },
				makeDir: { code: 'EACCESS' }
			})

			cases.set('EACCESS', { writeCalled: true, write: { code: 'EACCESS' } })
			cases.set('EMFILE', { writeCalled: true, write: { code: 'EMFILE' } })
			cases.set('ENOSPC', { writeCalled: true, write: { code: 'ENOSPC' } })
			cases.set('EISDIR', { writeCalled: true, write: { code: 'EISDIR' } })
			cases.set('UNEXPECTED', {
				writeCalled: true,
				write: { code: 'UNEXPECTED' }
			})

			for (const [key, mocked] of cases.entries()) {
				it(`should handle '${key}' error`, async () => {
					if ('checkDir' in mocked) {
						jest.spyOn(fileUtil, 'checkDir').mockImplementation((dir: string) =>
							Effect.fail(
								new FileHandler.AccessError(
									Object.assign(new Error('mocked error message'), {
										code: mocked.checkDir?.code
									}),
									dir,
									'ACCESS'
								)
							)
						)
					} else {
						jest
							.spyOn(fileUtil, 'checkDir')
							.mockImplementation((dir: string) => Effect.succeed(dir))
					}

					if ('makeDir' in mocked) {
						jest.spyOn(fileUtil, 'makeDir').mockImplementation((dir: string) =>
							Effect.fail(
								new FileHandler.AccessError(
									Object.assign(new Error('mocked error message'), {
										code: mocked.makeDir?.code
									}),
									dir,
									'MKDIR'
								)
							)
						)
					} else {
						jest
							.spyOn(fileUtil, 'makeDir')
							.mockImplementation((dir: string) => Effect.succeed(dir))
					}

					const mockedWriteStream = {
						on: jest.fn(),
						write: jest.fn(),
						end: jest.fn()
					}

					;(fs.createWriteStream as unknown as jest.Mock).mockReturnValue(
						mockedWriteStream
					)

					if ('write' in mocked) {
						mockedWriteStream.on.mockImplementation((event, callback) => {
							if (event === 'error') {
								callback(
									Object.assign(new Error('mocked error message'), {
										code: mocked.write?.code
									})
								)
							}
						})
					}

					const result = await fileUtil
						.write(mockedFile, faker.lorem.paragraph())
						.pipe(
							Effect.match({
								onSuccess: () => {
									throw new Error('Expected the effect to fail.')
								},
								onFailure: (error) => {
									expect(error).toBeDefined()
									expect(error).toBeInstanceOf(FileHandler.AccessError)
									if ('makeDir' in mocked) {
										expect(error.code).toBe(mocked.makeDir?.code)
									} else if ('checkDir' in mocked) {
										expect(error.code).toBe(mocked.checkDir?.code)
									} else if ('write' in mocked) {
										expect(error.code).toBe(mocked.write?.code)
									} else {
										throw new Error('Unexpected Error occured.')
									}
								}
							}),
							Effect.runPromise
						)

					expect(result).toBeUndefined()
					if (mocked.writeCalled) {
						expect(fs.createWriteStream).toHaveBeenCalledWith(mockedFile)
					} else {
						expect(fs.createWriteStream).not.toHaveBeenCalledWith(mockedFile)
					}
				})
			}
		})

		describe('Module dependencies', () => {
			it('checks for file access', async () => {
				jest
					.spyOn(fileUtil, 'checkDir')
					.mockImplementation((dir: string) => Effect.succeed(dir))

				const mockedWriteStream = new (require('stream').Writable)()
				mockedWriteStream._write = jest.fn((_, __, cb) => cb())
				;(fs.createWriteStream as jest.Mock).mockReturnValue(mockedWriteStream)

				await fileUtil
					.write(mockedFile, faker.lorem.paragraph())
					.pipe(Effect.runPromise)
				expect(fileUtil.checkDir).toHaveBeenCalledWith(mockedDir)
				expect(fs.createWriteStream).toHaveBeenCalledWith(mockedFile)
			})

			it('create directory if inexistant', async () => {
				const error = Object.assign(new Error('mocked error message.'), {
					code: 'ENOENT'
				})
				jest
					.spyOn(fileUtil, 'checkDir')
					.mockImplementation((dir: string) =>
						Effect.fail(new FileHandler.AccessError(error, dir, 'ACCESS'))
					)

				jest
					.spyOn(fileUtil, 'makeDir')
					.mockImplementation((dir: string) => Effect.succeed(dir))

				const mockedWriteStream = new (require('stream').Writable)()
				mockedWriteStream._write = jest.fn((_, __, cb) => cb())
				;(fs.createWriteStream as jest.Mock).mockReturnValue(mockedWriteStream)

				await fileUtil
					.write(mockedFile, faker.lorem.paragraph())
					.pipe(Effect.runPromise)

				expect(fileUtil.checkDir).toHaveBeenCalledWith(mockedDir)
				expect(fileUtil.makeDir).toHaveBeenCalledWith(mockedDir)
				expect(fs.createWriteStream).toHaveBeenCalledWith(mockedFile)
			})
		})
	})
})
