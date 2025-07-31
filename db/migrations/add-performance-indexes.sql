-- Performance optimization indexes for book social content analyzer

-- Books table indexes
CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_analysis_status ON books(analysis_status);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_user_created ON books(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_user_status ON books(user_id, analysis_status);
CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre) WHERE genre IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_books_title_search ON books USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_books_author_search ON books USING gin(to_tsvector('english', author)) WHERE author IS NOT NULL;

-- Generated content table indexes
CREATE INDEX IF NOT EXISTS idx_generated_content_book_id ON generated_content(book_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_user_id ON generated_content(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_platform ON generated_content(platform);
CREATE INDEX IF NOT EXISTS idx_generated_content_status ON generated_content(status);
CREATE INDEX IF NOT EXISTS idx_generated_content_scheduled_at ON generated_content(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_generated_content_published_at ON generated_content(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_generated_content_user_platform ON generated_content(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_generated_content_user_status ON generated_content(user_id, status);
CREATE INDEX IF NOT EXISTS idx_generated_content_book_platform ON generated_content(book_id, platform);
CREATE INDEX IF NOT EXISTS idx_generated_content_created_at ON generated_content(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_content_user_created ON generated_content(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_content_search ON generated_content USING gin(to_tsvector('english', content));

-- Social accounts table indexes
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_accounts_active ON social_accounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_platform ON social_accounts(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_active ON social_accounts(user_id, is_active);

-- Post analytics table indexes
CREATE INDEX IF NOT EXISTS idx_post_analytics_content_id ON post_analytics(content_id);
CREATE INDEX IF NOT EXISTS idx_post_analytics_platform ON post_analytics(platform);
CREATE INDEX IF NOT EXISTS idx_post_analytics_last_updated ON post_analytics(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_post_analytics_content_platform ON post_analytics(content_id, platform);
CREATE INDEX IF NOT EXISTS idx_post_analytics_engagement ON post_analytics(likes + shares + comments DESC);
CREATE INDEX IF NOT EXISTS idx_post_analytics_impressions ON post_analytics(impressions DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_books_user_status_created ON books(user_id, analysis_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_user_book_platform ON generated_content(user_id, book_id, platform);
CREATE INDEX IF NOT EXISTS idx_content_user_status_created ON generated_content(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_content_updated ON post_analytics(content_id, last_updated DESC);

-- Partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_books_completed_analysis ON books(user_id, created_at DESC) WHERE analysis_status = 'completed';
CREATE INDEX IF NOT EXISTS idx_content_published ON generated_content(user_id, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_content_scheduled ON generated_content(user_id, scheduled_at ASC) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_content_draft ON generated_content(user_id, created_at DESC) WHERE status = 'draft';

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_books_full_text ON books USING gin(
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(author, '') || ' ' || coalesce(genre, ''))
);

CREATE INDEX IF NOT EXISTS idx_content_full_text ON generated_content USING gin(
  to_tsvector('english', content)
);

-- Performance statistics
CREATE INDEX IF NOT EXISTS idx_analytics_performance_stats ON post_analytics(
  platform, 
  last_updated DESC, 
  (likes + shares + comments) DESC
) WHERE impressions > 0;