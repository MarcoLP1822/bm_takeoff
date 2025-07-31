// Mock database module for tests
export const db = {
  select: jest.fn(() => ({
    from: jest.fn(() => ({
      where: jest.fn(() => ({
        limit: jest.fn()
      }))
    }))
  })),
  update: jest.fn(() => ({
    set: jest.fn(() => ({
      where: jest.fn()
    }))
  })),
  insert: jest.fn(() => ({
    values: jest.fn()
  })),
  delete: jest.fn(() => ({
    where: jest.fn()
  }))
}
