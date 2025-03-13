import { Effect } from 'effect'

export const checkFile = (file: string) => Effect.succeed(file)
export const makeDir = (dir: string) => Effect.succeed(dir)
export const write = (file: string) => Effect.succeed(file)
