import { PrismaClient } from '@prisma/client'

const PREFIXES: Record<string, string> = {
  intervento: 'INT',
  preventivo: 'PRV',
  ddt: 'DDT',
  fattura: 'FPR',
}

export async function getNextNumber(
  prisma: PrismaClient,
  type: string
): Promise<{ number: string; sequence: number; year: number }> {
  const year = new Date().getFullYear()
  const counter = await prisma.counter.upsert({
    where: { type_year: { type, year } },
    update: { sequence: { increment: 1 } },
    create: { type, year, sequence: 1 },
  })
  const prefix = PREFIXES[type] || type.toUpperCase()
  const number = `${prefix}-${year}-${String(counter.sequence).padStart(3, '0')}`
  return { number, sequence: counter.sequence, year }
}
