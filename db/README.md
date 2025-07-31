# Database Schema Documentation

## Overview

This document describes the database schema for the Book Social Content Analyzer application. The schema is implemented using Drizzle ORM with PostgreSQL.

## Tables

### 1. Books (`books`)
Stores uploaded book information and analysis results.

**Columns:**
- `id` (UUID, Primary Key) - Unique book identifier
- `user_id` (Text, Not Null) - User who uploaded the book
- `title` (Text, Not Null) - Book title
- `author` (Text) - Book author
- `genre` (Text) - Book genre
- `file_url` (Text, Not Null) - URL to stored book file
- `file_name` (Text, Not Null) - Original filename
- `file_size` (Text) - File size information
- `text_content` (Text) - Extracted text content
- `analysis_status` (Enum: pending, processing, completed, failed) - Analysis status
- `analysis_data` (JSON) - AI analysis results (themes, quotes, insights)
- `created_at` (Timestamp) - Creation timestamp
- `updated_at` (Timestamp) - Last update timestamp

### 2. Generated Content (`generated_content`)
Stores AI-generated social media content based on book analysis.

**Columns:**
- `id` (UUID, Primary Key) - Unique content identifier
- `book_id` (UUID, Foreign Key → books.id) - Source book reference
- `user_id` (Text, Not Null) - Content owner
- `platform` (Enum: twitter, instagram, linkedin, facebook) - Target platform
- `content_type` (Enum: post, story, article) - Content type
- `content` (Text, Not Null) - Generated content text
- `hashtags` (Text Array) - Suggested hashtags
- `image_url` (Text) - Associated image URL
- `status` (Enum: draft, scheduled, published, failed) - Content status
- `scheduled_at` (Timestamp) - Scheduled publication time
- `published_at` (Timestamp) - Actual publication time
- `social_post_id` (Text) - Platform-specific post ID after publishing
- `created_at` (Timestamp) - Creation timestamp
- `updated_at` (Timestamp) - Last update timestamp

**Foreign Keys:**
- `book_id` references `books(id)` with CASCADE delete

### 3. Social Accounts (`social_accounts`)
Stores connected social media account information.

**Columns:**
- `id` (UUID, Primary Key) - Unique account identifier
- `user_id` (Text, Not Null) - Account owner
- `platform` (Enum: twitter, instagram, linkedin, facebook) - Social platform
- `account_id` (Text, Not Null) - Platform-specific account ID
- `account_name` (Text, Not Null) - Display name
- `account_handle` (Text) - Username/handle
- `access_token` (Text, Not Null) - OAuth access token
- `refresh_token` (Text) - OAuth refresh token
- `token_expires_at` (Timestamp) - Token expiration time
- `is_active` (Boolean, Default: true) - Account status
- `created_at` (Timestamp) - Creation timestamp
- `updated_at` (Timestamp) - Last update timestamp

### 4. Post Analytics (`post_analytics`)
Stores engagement metrics for published social media posts.

**Columns:**
- `id` (UUID, Primary Key) - Unique analytics record identifier
- `content_id` (UUID, Foreign Key → generated_content.id) - Content reference
- `platform` (Text, Not Null) - Social platform
- `post_id` (Text, Not Null) - Platform-specific post ID
- `impressions` (Integer, Default: 0) - Number of impressions
- `likes` (Integer, Default: 0) - Number of likes
- `shares` (Integer, Default: 0) - Number of shares
- `comments` (Integer, Default: 0) - Number of comments
- `clicks` (Integer, Default: 0) - Number of clicks
- `reach` (Integer, Default: 0) - Unique users reached
- `engagement_rate` (Text) - Calculated engagement percentage
- `last_updated` (Timestamp) - Last metrics update
- `created_at` (Timestamp) - Creation timestamp

**Foreign Keys:**
- `content_id` references `generated_content(id)` with CASCADE delete

## Relationships

- **Books → Generated Content**: One-to-many (one book can have multiple generated posts)
- **Generated Content → Post Analytics**: One-to-many (one post can have multiple analytics records)

## Enums

- `analysis_status`: pending, processing, completed, failed
- `platform`: twitter, instagram, linkedin, facebook
- `content_type`: post, story, article
- `content_status`: draft, scheduled, published, failed
- `social_platform`: twitter, instagram, linkedin, facebook

## Seed Data

The database includes comprehensive seed data for testing:

- **Books**: 3 sample books with different analysis statuses
- **Generated Content**: 4 sample social media posts across different platforms
- **Social Accounts**: 5 connected social media accounts for testing
- **Post Analytics**: 4 sample analytics records with engagement metrics

## Usage

### Generate Migration
```bash
npm run db:generate
```

### Run Migration
```bash
npm run db:migrate
```

### Seed Database
```bash
npm run db:seed
```

### Validate Schema
```bash
npx tsx db/validate-schema.ts
```

## Requirements Satisfied

This schema implementation satisfies the following requirements:

- **Requirement 1.3**: Store extracted text content from uploaded books
- **Requirement 2.6**: Store AI analysis results and handle analysis failures
- **Requirement 5.3**: Securely store social media account tokens
- **Requirement 8.2**: Maintain book metadata and organization