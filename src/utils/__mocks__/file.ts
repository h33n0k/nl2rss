import { Effect } from 'effect'
import { faker } from '@faker-js/faker'

export const checkFile = (file: string) => Effect.succeed(file)
export const makeDir = (dir: string) => Effect.succeed(dir)
export const write = (file: string) => Effect.succeed(file)
export const read = () => Effect.succeed(faker.lorem.sentence())
