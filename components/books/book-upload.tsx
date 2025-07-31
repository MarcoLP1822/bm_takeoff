'use client'

import { useState, useCallback } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Book {
  id: string
  title: string
  author?: string
  genre?: string
  fileName: string
  fileSize?: string
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  updatedAt: string
}

interface BookUploadProps {
  onUploadSuccess?: (book: Book) => void
  onUploadError?: (error: string) => void
}

interface UploadState {
  isUploading: boolean
  progress: number
  error: string | null
  success: boolean
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/epub+zip': ['.epub'],
  'text/plain': ['.txt'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export function BookUpload({ onUploadSuccess, onUploadError }: BookUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: false
  })

  const uploadFile = useCallback(async (file: File) => {
    setUploadState({
      isUploading: true,
      progress: 0,
      error: null,
      success: false
    })

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/books/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      
      setUploadState({
        isUploading: false,
        progress: 100,
        error: null,
        success: true
      })

      onUploadSuccess?.(result.book)
      
      // Reset success state after 3 seconds
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, success: false, progress: 0 }))
      }, 3000)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadState({
        isUploading: false,
        progress: 0,
        error: errorMessage,
        success: false
      })
      onUploadError?.(errorMessage)
    }
  }, [onUploadSuccess, onUploadError])

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      let errorMessage = 'File rejected'
      
      if (rejection.errors.some((e: { code: string }) => e.code === 'file-too-large')) {
        errorMessage = 'File is too large. Maximum size is 50MB.'
      } else if (rejection.errors.some((e: { code: string }) => e.code === 'file-invalid-type')) {
        errorMessage = 'Invalid file type. Please upload PDF, EPUB, TXT, or DOCX files.'
      }
      
      setUploadState(prev => ({ ...prev, error: errorMessage }))
      return
    }

    if (acceptedFiles.length > 0) {
      uploadFile(acceptedFiles[0])
    }
  }, [uploadFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: uploadState.isUploading
  })

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400",
          uploadState.isUploading && "cursor-not-allowed opacity-50",
          uploadState.success && "border-green-500 bg-green-50"
        )}
      >
        <input {...getInputProps()} role="textbox" />
        
        <div className="flex flex-col items-center space-y-4">
          {uploadState.success ? (
            <CheckCircle className="h-12 w-12 text-green-500" />
          ) : (
            <Upload className="h-12 w-12 text-gray-400" />
          )}
          
          <div>
            {uploadState.isUploading ? (
              <p className="text-lg font-medium">Uploading...</p>
            ) : uploadState.success ? (
              <p className="text-lg font-medium text-green-600">Upload successful!</p>
            ) : isDragActive ? (
              <p className="text-lg font-medium">Drop your book file here</p>
            ) : (
              <div>
                <p className="text-lg font-medium">Drag & drop a book file here</p>
                <p className="text-sm text-gray-500 mt-1">or click to browse</p>
              </div>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            <p>Supported formats: PDF, EPUB, TXT, DOCX</p>
            <p>Maximum file size: 50MB</p>
          </div>
          
          {!uploadState.isUploading && !uploadState.success && (
            <Button variant="outline" className="mt-4">
              <FileText className="h-4 w-4 mr-2" />
              Choose File
            </Button>
          )}
        </div>
      </div>

      {uploadState.isUploading && (
        <div className="mt-4">
          <Progress value={uploadState.progress} className="w-full" />
          <p className="text-sm text-gray-500 mt-2 text-center">
            Processing your book...
          </p>
        </div>
      )}

      {uploadState.error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadState.error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}