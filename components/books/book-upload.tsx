"use client"

import { useState, useCallback, useRef } from "react"
import { useDropzone, FileRejection } from "react-dropzone"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Book {
  id: string
  title: string
  author?: string
  genre?: string
  fileName: string
  fileSize?: string
  analysisStatus: "pending" | "processing" | "completed" | "failed"
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
  "application/pdf": [".pdf"],
  "application/epub+zip": [".epub"],
  "text/plain": [".txt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx"
  ]
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export function BookUpload({
  onUploadSuccess,
  onUploadError
}: BookUploadProps) {
  const t = useTranslations('books')
  
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: false
  })
  
  const progressRef = useRef(0)

  const uploadFile = useCallback(
    async (file: File) => {
      setUploadState({
        isUploading: true,
        progress: 0,
        error: null,
        success: false
      })
      
      progressRef.current = 0

      try {
        const formData = new FormData()
        formData.append("file", file)

        // Use XMLHttpRequest to track upload progress
        const uploadPromise = new Promise<{ book: Book; success: boolean; message: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest()

          // Track upload progress
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              // Upload progress represents 0-80% of total progress
              const uploadPercent = Math.round((event.loaded / event.total) * 80)
              progressRef.current = uploadPercent
              setUploadState(prev => ({
                ...prev,
                progress: uploadPercent
              }))
            }
          })

          // Handle upload completion
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              // Simulate text extraction and processing phases (80-100%)
              setUploadState(prev => ({ ...prev, progress: 85 }))
              
              setTimeout(() => {
                setUploadState(prev => ({ ...prev, progress: 95 }))
              }, 300)
              
              setTimeout(() => {
                setUploadState(prev => ({ ...prev, progress: 100 }))
              }, 600)
              
              try {
                const result = JSON.parse(xhr.responseText)
                resolve(result)
              } catch (e) {
                reject(new Error('Invalid response format'))
              }
            } else {
              try {
                const errorData = JSON.parse(xhr.responseText)
                reject(new Error(errorData.error || t('uploadFailed')))
              } catch (e) {
                reject(new Error(`Upload failed with status ${xhr.status}`))
              }
            }
          })

          // Handle upload error
          xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'))
          })

          // Handle upload timeout
          xhr.addEventListener('timeout', () => {
            reject(new Error('Upload timeout'))
          })

          // Start the upload
          xhr.open('POST', '/api/books/upload')
          xhr.timeout = 300000 // 5 minutes timeout
          xhr.send(formData)
        })

        const result = await uploadPromise

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
          progressRef.current = 0
        }, 3000)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : t('uploadFailed')
        setUploadState({
          isUploading: false,
          progress: 0,
          error: errorMessage,
          success: false
        })
        progressRef.current = 0
        onUploadError?.(errorMessage)
      }
    },
    [onUploadSuccess, onUploadError, t]
  )

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0]
        let errorMessage = "File rejected"

        if (
          rejection.errors.some(
            (e: { code: string }) => e.code === "file-too-large"
          )
        ) {
          errorMessage = "File is too large. Maximum size is 50MB."
        } else if (
          rejection.errors.some(
            (e: { code: string }) => e.code === "file-invalid-type"
          )
        ) {
          errorMessage =
            "Invalid file type. Please upload PDF, EPUB, TXT, or DOCX files."
        }

        setUploadState(prev => ({ ...prev, error: errorMessage }))
        return
      }

      if (acceptedFiles.length > 0) {
        uploadFile(acceptedFiles[0])
      }
    },
    [uploadFile]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: uploadState.isUploading
  })

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div
        {...getRootProps()}
        className={cn(
          "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-gray-300 hover:border-gray-400",
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
              <p className="text-lg font-medium text-green-600">
                {t('uploadSuccessful')}
              </p>
            ) : isDragActive ? (
              <p className="text-lg font-medium">Drop your book file here</p>
            ) : (
              <div>
                <p className="text-lg font-medium">
                  {t('dragAndDrop')}
                </p>
                <p className="mt-1 text-sm text-gray-500">{t('clickToBrowse')}</p>
              </div>
            )}
          </div>

          <div className="text-sm text-gray-500">
            <p>{t('supportedFormatsExtended')}</p>
            <p>{t('maxFileSize')}</p>
          </div>

          {!uploadState.isUploading && !uploadState.success && (
            <Button variant="outline" className="mt-4">
              <FileText className="mr-2 h-4 w-4" />
              Choose File
            </Button>
          )}
        </div>
      </div>

      {uploadState.isUploading && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-gray-600 font-medium">
                {uploadState.progress < 95 ? "Uploading file..." : "Processing content..."}
              </p>
            </div>
            <span className="text-sm font-bold text-blue-600">
              {uploadState.progress}%
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={uploadState.progress} 
              className="w-full h-3 bg-gray-200" 
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-white drop-shadow-sm">
                {uploadState.progress < 10 ? "" : `${uploadState.progress}%`}
              </span>
            </div>
          </div>
          <p className="text-xs text-center text-gray-500">
            {uploadState.progress < 30 && "Validating file format..."}
            {uploadState.progress >= 30 && uploadState.progress < 70 && "Uploading to secure storage..."}
            {uploadState.progress >= 70 && uploadState.progress < 95 && "Extracting text content..."}
            {uploadState.progress >= 95 && "Finalizing upload..."}
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
