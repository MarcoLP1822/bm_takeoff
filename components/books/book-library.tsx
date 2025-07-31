'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Search, 
  BookOpen, 
  Calendar, 
  User, 
  Tag, 
  Eye,
  Trash2,
  AlertCircle,
  Filter,
  X,
  SortAsc,
  SortDesc,
  Loader2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDistanceToNow } from 'date-fns'
import { LazyLoadingList, BookSkeleton } from '@/components/utility/lazy-loading'

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

interface BookFilters {
  genres: string[]
  authors: string[]
  analysisStatuses: string[]
}

interface BookLibraryProps {
  onBookSelect?: (book: Book) => void
  onBookDelete?: (bookId: string) => void
  refreshTrigger?: number
}

type SortBy = 'title' | 'author' | 'genre' | 'createdAt' | 'updatedAt'
type SortOrder = 'asc' | 'desc'

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'processing':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'completed':
      return 'Analysis Complete'
    case 'processing':
      return 'Analyzing...'
    case 'failed':
      return 'Analysis Failed'
    default:
      return 'Pending Analysis'
  }
}

export function BookLibrary({ onBookSelect, onBookDelete, refreshTrigger }: BookLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<string>('')
  const [selectedAuthor, setSelectedAuthor] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortBy>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [filters, setFilters] = useState<BookFilters>({
    genres: [],
    authors: [],
    analysisStatuses: []
  })
  const [forceReloadTrigger, setForceReloadTrigger] = useState(0)
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Use refs to store current values for stable function
  const searchQueryRef = useRef(searchQuery)
  const selectedGenreRef = useRef(selectedGenre)
  const selectedAuthorRef = useRef(selectedAuthor)
  const selectedStatusRef = useRef(selectedStatus)
  const sortByRef = useRef(sortBy)
  const sortOrderRef = useRef(sortOrder)

  // Update refs when values change
  useEffect(() => {
    searchQueryRef.current = searchQuery
  }, [searchQuery])
  
  useEffect(() => {
    selectedGenreRef.current = selectedGenre
  }, [selectedGenre])
  
  useEffect(() => {
    selectedAuthorRef.current = selectedAuthor
  }, [selectedAuthor])
  
  useEffect(() => {
    selectedStatusRef.current = selectedStatus
  }, [selectedStatus])
  
  useEffect(() => {
    sortByRef.current = sortBy
  }, [sortBy])
  
  useEffect(() => {
    sortOrderRef.current = sortOrder
  }, [sortOrder])

  // Load data function for lazy loading - stable dependencies
  const loadBooks = useCallback(async (offset: number, limit: number) => {
    const params = new URLSearchParams({
      sortBy: sortByRef.current,
      sortOrder: sortOrderRef.current,
      limit: limit.toString(),
      offset: offset.toString()
    })
    
    if (searchQueryRef.current.trim()) {
      params.append('search', searchQueryRef.current.trim())
    }
    
    if (selectedGenreRef.current) {
      params.append('genre', selectedGenreRef.current)
    }
    
    if (selectedAuthorRef.current) {
      params.append('author', selectedAuthorRef.current)
    }
    
    if (selectedStatusRef.current) {
      params.append('analysisStatus', selectedStatusRef.current)
    }
    
    const response = await fetch(`/api/books?${params.toString()}`)
    if (!response.ok) {
      throw new Error('Failed to fetch books')
    }
    
    const data = await response.json()
    
    // Update filters on first load
    if (offset === 0) {
      setFilters(data.filters || { genres: [], authors: [], analysisStatuses: [] })
    }
    
    return {
      items: data.books || [],
      hasMore: data.pagination?.hasMore || false,
      total: data.pagination?.total || 0
    }
  }, [])

  // Force reload when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setForceReloadTrigger(prev => prev + 1)
    }, 300) // Debounce to avoid too many requests
    
    return () => clearTimeout(timeoutId)
  }, [searchQuery, selectedGenre, selectedAuthor, selectedStatus, sortBy, sortOrder])

  // Utility functions
  const hasActiveFilters = searchQuery.trim() || selectedGenre || selectedAuthor || selectedStatus

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedGenre('')
    setSelectedAuthor('')
    setSelectedStatus('')
  }

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  const handleDeleteBook = async (bookId: string) => {
    if (onBookDelete) {
      setDeletingBookId(bookId)
      try {
        await onBookDelete(bookId)
      } finally {
        setDeletingBookId(null)
        setShowDeleteDialog(false)
        setBookToDelete(null)
      }
    }
  }

  const confirmDelete = (book: Book) => {
    setBookToDelete(book)
    setShowDeleteDialog(true)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // No need for separate fetchBooks since LazyLoadingList handles data loading

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search books by title, author, or genre... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('')
                }
              }}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {[searchQuery.trim(), selectedGenre, selectedAuthor, selectedStatus].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter by Genre</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSelectedGenre('')}>
                <span className={selectedGenre === '' ? 'font-medium' : ''}>All Genres</span>
              </DropdownMenuItem>
              {filters.genres.map((genre) => (
                <DropdownMenuCheckboxItem
                  key={genre}
                  checked={selectedGenre === genre}
                  onCheckedChange={(checked) => setSelectedGenre(checked ? genre : '')}
                >
                  {genre}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Filter by Author</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSelectedAuthor('')}>
                <span className={selectedAuthor === '' ? 'font-medium' : ''}>All Authors</span>
              </DropdownMenuItem>
              {filters.authors.map((author) => (
                <DropdownMenuCheckboxItem
                  key={author}
                  checked={selectedAuthor === author}
                  onCheckedChange={(checked) => setSelectedAuthor(checked ? author : '')}
                >
                  {author}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSelectedStatus('')}>
                <span className={selectedStatus === '' ? 'font-medium' : ''}>All Statuses</span>
              </DropdownMenuItem>
              {filters.analysisStatuses.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={selectedStatus === status}
                  onCheckedChange={(checked) => setSelectedStatus(checked ? status : '')}
                >
                  {getStatusText(status)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="author">Author</SelectItem>
                <SelectItem value="genre">Genre</SelectItem>
                <SelectItem value="createdAt">Upload Date</SelectItem>
                <SelectItem value="updatedAt">Last Updated</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSortOrder}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="text-sm text-gray-500">
            Search results will be displayed below
          </div>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-600">Active filters:</span>
            
            {searchQuery.trim() && (
              <Badge variant="secondary" className="gap-1">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="ml-1 hover:bg-gray-200 rounded">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            
            {selectedGenre && (
              <Badge variant="secondary" className="gap-1">
                Genre: {selectedGenre}
                <button onClick={() => setSelectedGenre('')} className="ml-1 hover:bg-gray-200 rounded">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            
            {selectedAuthor && (
              <Badge variant="secondary" className="gap-1">
                Author: {selectedAuthor}
                <button onClick={() => setSelectedAuthor('')} className="ml-1 hover:bg-gray-200 rounded">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            
            {selectedStatus && (
              <Badge variant="secondary" className="gap-1">
                Status: {getStatusText(selectedStatus)}
                <button onClick={() => setSelectedStatus('')} className="ml-1 hover:bg-gray-200 rounded">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 px-2 text-xs"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Lazy Loading Book List */}
      <LazyLoadingList
        loadDataAction={loadBooks}
        renderItemAction={(book: Book) => (
            <div key={book.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {book.title}
                    </h3>
                    <Badge className={getStatusColor(book.analysisStatus)}>
                      {getStatusText(book.analysisStatus)}
                    </Badge>
                  </div>
                  
                  {/* Action buttons below the badge */}
                  <div className="flex gap-2 mb-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onBookSelect?.(book)} 
                      data-testid={`view-details-${book.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => confirmDelete(book)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid={`delete-book-${book.id}`}
                      disabled={deletingBookId === book.id}
                    >
                      {deletingBookId === book.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      {deletingBookId === book.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {book.author && (
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-1" />
                        {book.author}
                      </div>
                    )}
                    
                    {book.genre && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Tag className="h-4 w-4 mr-1" />
                        {book.genre}
                      </div>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      Uploaded {formatDistanceToNow(new Date(book.createdAt), { addSuffix: true })}
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      File: {book.fileName} {book.fileSize && `(${book.fileSize})`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
        )}
        renderSkeleton={() => <BookSkeleton />}
        renderEmpty={() => (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No books found
            </h3>
            <p className="text-gray-500">
              Try adjusting your search terms or filters
            </p>
          </div>
        )}
        renderError={(error, retry) => (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Failed to load books
            </h3>
            <p className="text-gray-500 mb-4">{error.message}</p>
            <Button onClick={retry}>Try Again</Button>
          </div>
        )}
        itemsPerPage={20}
        className="grid gap-4"
        dependencies={[forceReloadTrigger, refreshTrigger]}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Book</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{bookToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={deletingBookId !== null}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => bookToDelete && handleDeleteBook(bookToDelete.id)}
              disabled={deletingBookId !== null}
            >
              {deletingBookId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Book'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}