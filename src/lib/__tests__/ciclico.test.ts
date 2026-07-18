import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}))

import { prisma } from '@/lib/prisma'
import { detectaCiclo } from '@/lib/ciclico'

describe('detectaCiclo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true when same task (self-reference)', async () => {
    const result = await detectaCiclo(1, 1)
    expect(result).toBe(true)
    expect(prisma.$queryRaw).not.toHaveBeenCalled()
  })

  it('returns true when cycle exists (chain that closes loop)', async () => {
    // If a dependency from 1→2, 2→3 exists, adding 3→1 would close the loop
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ ciclo: true }])

    const result = await detectaCiclo(1, 3)
    expect(result).toBe(true)
  })

  it('returns false when no cycle exists', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ ciclo: false }])

    const result = await detectaCiclo(1, 2)
    expect(result).toBe(false)
  })

  it('returns false when raw query returns empty array', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([])

    const result = await detectaCiclo(1, 2)
    expect(result).toBe(false)
  })
})
