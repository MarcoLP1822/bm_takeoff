// Setup environment variables for all tests
import { config } from 'dotenv'

config({ path: '.env.test' })

// Set default environment variables for testing
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test"
process.env.UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || "https://test.redis.com"
process.env.UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "test-token"
