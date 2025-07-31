// Mock for @upstash/redis
export class Redis {
  constructor() {
    return {
      setex: jest.fn().mockResolvedValue("OK"),
      zadd: jest.fn().mockResolvedValue(1),
      zrange: jest.fn().mockResolvedValue([]),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      zrem: jest.fn().mockResolvedValue(1)
    }
  }
}
