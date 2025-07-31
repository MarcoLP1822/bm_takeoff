# File Upload and Processing Infrastructure

This document describes the file upload and processing infrastructure implemented for the Book Social Content Analyzer.

## Overview

The file upload infrastructure handles the secure upload, validation, and text extraction of book files in multiple formats (PDF, EPUB, TXT, DOCX). It integrates with Supabase Storage for secure file storage and provides comprehensive error handling and validation.

## Supported File Formats

- **PDF** (`.pdf`) - Portable Document Format
- **EPUB** (`.epub`) - Electronic Publication format
- **DOCX** (`.docx`) - Microsoft Word Document
- **TXT** (`.txt`) - Plain Text files

## File Size Limits

- Maximum file size: **50MB**
- Empty files are rejected
- File size validation occurs before upload

## API Endpoints

### Upload Book File
```
POST /api/books/upload
```

**Request:**
- Content-Type: `multipart/form-data`
- Body: FormData with `file` field

**Response:**
```json
{
  "success": true,
  "book": {
    "id": "uuid",
    "title": "Book Title",
    "author": "Author Name",
    "fileName": "original-filename.pdf",
    "fileSize": "2.5 MB",
    "analysisStatus": "pending",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "message": "File uploaded successfully and text extracted"
}
```

### Retry Text Extraction
```
POST /api/books/{bookId}/extract-text
```

**Response:**
```json
{
  "success": true,
  "message": "Text extraction completed successfully",
  "book": {
    "id": "uuid",
    "title": "Updated Title",
    "author": "Extracted Author",
    "analysisStatus": "pending",
    "wordCount": 50000
  }
}
```

### Get Books List
```
GET /api/books?limit=10&offset=0
```

**Response:**
```json
{
  "success": true,
  "books": [...],
  "pagination": {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

### Get Book Details
```
GET /api/books/{bookId}
```

### Delete Book
```
DELETE /api/books/{bookId}
```

## File Processing Flow

1. **Upload Validation**
   - File format validation (MIME type and extension)
   - File size validation (max 50MB)
   - Empty file detection

2. **Secure Storage**
   - Upload to Supabase Storage with unique filename
   - Generate public URL for file access
   - Store file metadata in database

3. **Text Extraction**
   - Extract text content based on file format
   - Extract metadata (title, author, word count)
   - Handle extraction errors gracefully

4. **Database Storage**
   - Save book record with extracted metadata
   - Set analysis status based on extraction success
   - Store file URL and processing information

## Text Extraction Services

### TextExtractionService

Located in `lib/text-extraction.ts`, this service handles text extraction from different file formats:

```typescript
// Extract text from any supported format
const result = await TextExtractionService.extractText(buffer, mimeType, fileName)

// Validate file format
const isValid = TextExtractionService.isValidFileFormat(mimeType)

// Get file extension from MIME type
const extension = TextExtractionService.getFileExtension(mimeType)
```

### File Validation Service

Located in `lib/file-validation.ts`, provides client-side validation utilities:

```typescript
// Validate file before upload
const validation = FileValidationService.validateFile(file)

// Format file size for display
const sizeText = FileValidationService.formatFileSize(file.size)

// Get supported formats
const formats = FileValidationService.getSupportedFormatsText()
```

## Error Handling

### Upload Errors
- **401 Unauthorized**: User not authenticated
- **400 Bad Request**: Invalid file format, size, or missing file
- **500 Internal Server Error**: Storage or processing failures

### Text Extraction Errors
- **404 Not Found**: Book not found or doesn't belong to user
- **500 Internal Server Error**: Extraction or storage failures

### Common Error Response Format
```json
{
  "error": "Error type",
  "details": "Detailed error message",
  "supportedFormats": ["PDF", "EPUB", "DOCX", "TXT"] // when applicable
}
```

## Environment Variables

Add these to your `.env` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Storage Configuration

### Supabase Storage Bucket

Create a storage bucket named `books` in your Supabase project with the following configuration:

- **Public**: No (files are accessed via signed URLs)
- **File size limit**: 50MB
- **Allowed MIME types**: 
  - `application/pdf`
  - `application/epub+zip`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `text/plain`

### Storage Policies

Set up Row Level Security (RLS) policies:

```sql
-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload to own folder" ON storage.objects
FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to read their own files
CREATE POLICY "Users can read own files" ON storage.objects
FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);
```

## Testing

Run the test suite for file processing:

```bash
npm run test:unit -- --testPathPattern="file-validation|text-extraction"
```

### Test Coverage

- File format validation
- File size validation
- Text extraction for all supported formats
- Error handling scenarios
- MIME type and extension matching

## Dependencies

### Core Dependencies
- `@supabase/supabase-js` - Supabase client
- `pdf-parse` - PDF text extraction
- `epub2` - EPUB text extraction
- `mammoth` - DOCX text extraction
- `uuid` - Unique filename generation

### Development Dependencies
- `@types/pdf-parse` - TypeScript definitions
- `@types/uuid` - TypeScript definitions

## Security Considerations

1. **File Validation**: Strict MIME type and extension validation
2. **Size Limits**: 50MB maximum to prevent abuse
3. **Authentication**: All endpoints require user authentication
4. **Storage Security**: Files stored in user-specific folders
5. **Input Sanitization**: All file inputs are validated and sanitized

## Performance Considerations

1. **Streaming**: Large files are processed in chunks
2. **Error Recovery**: Failed extractions can be retried
3. **Async Processing**: Text extraction doesn't block upload response
4. **Caching**: Extracted text is cached in database

## Future Enhancements

1. **Virus Scanning**: Integrate file scanning before processing
2. **OCR Support**: Add OCR for scanned PDFs
3. **Batch Upload**: Support multiple file uploads
4. **Progress Tracking**: Real-time upload progress
5. **File Compression**: Compress stored text content
6. **Cleanup Jobs**: Automated cleanup of orphaned files