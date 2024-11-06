import { createHash } from 'crypto'

export const hashString = (data: string) => createHash('sha256').update(data).digest('hex')
