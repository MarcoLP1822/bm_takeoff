"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  Loader2,
  Edit3
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { formatDistanceToNow } from "date-fns"
import {
  LazyLoadingList,
  BookSkeleton
} from "@/components/utility/lazy-loading"

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

interface BookFilters {
  genres: string[]
  authors: string[]
  analysisStatuses: string[]
}

interface BookLibraryProps {
  onBookSelect?: (book: Book) => void
  onBookDelete?: (bookId: string) => void
  onBookRename?: (bookId: string, title: string, author?: string) => void
  refreshTrigger?: number
}

type SortBy = "title" | "author" | "genre" | "createdAt" | "updatedAt"
type SortOrder = "asc" | "desc"

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 border-green-200"
    case "processing":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "failed":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export function BookLibrary({
  onBookSelect,
  onBookDelete,
  onBookRename,
  refreshTrigger
}: BookLibraryProps) {
  const t = useTranslations('books')
  
  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return t('status.analysisComplete')
      case "processing":
        return t('status.analyzingContent')
      case "failed":
        return t('status.analysisFailed')
      default:
        return t('status.pendingAnalysis')
    }
  }
  
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGenre, setSelectedGenre] = useState<string>("")
  const [selectedAuthor, setSelectedAuthor] = useState<string>("")
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [sortBy, setSortBy] = useState<SortBy>("createdAt")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [filters, setFilters] = useState<BookFilters>({
    genres: [],
    authors: [],
    analysisStatuses: []
  })
  const [forceReloadTrigger, setForceReloadTrigger] = useState(0)
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [bookToRename, setBookToRename] = useState<Book | null>(null)
  const [renamingBookId, setRenamingBookId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [newAuthor, setNewAuthor] = useState("")
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
      params.append("search", searchQueryRef.current.trim())
    }

    if (selectedGenreRef.current) {
      params.append("genre", selectedGenreRef.current)
    }

    if (selectedAuthorRef.current) {
      params.append("author", selectedAuthorRef.current)
    }

    if (selectedStatusRef.current) {
      params.append("analysisStatus", selectedStatusRef.current)
    }

    const response = await fetch(`/api/books?${params.toString()}`)
    if (!response.ok) {
      throw new Error("Failed to fetch books")
    }

    const data = await response.json()

    // Update filters on first load
    if (offset === 0) {
      setFilters(
        data.filters || { genres: [], authors: [], analysisStatuses: [] }
      )
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
  }, [
    searchQuery,
    selectedGenre,
    selectedAuthor,
    selectedStatus,
    sortBy,
    sortOrder
  ])

  // Utility functions
  const hasActiveFilters =
    searchQuery.trim() || selectedGenre || selectedAuthor || selectedStatus

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedGenre("")
    setSelectedAuthor("")
    setSelectedStatus("")
  }

  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === "asc" ? "desc" : "asc"))
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

  const confirmRename = (book: Book) => {
    setBookToRename(book)
    setNewTitle(book.title)
    setNewAuthor(book.author || "")
    setShowRenameDialog(true)
  }

  const handleRenameBook = async () => {
    if (bookToRename && onBookRename && newTitle.trim()) {
      setRenamingBookId(bookToRename.id)
      try {
        await onBookRename(bookToRename.id, newTitle.trim(), newAuthor.trim() || undefined)
      } finally {
        setRenamingBookId(null)
        setShowRenameDialog(false)
        setBookToRename(null)
        setNewTitle("")
        setNewAuthor("")
      }
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // No need for separate fetchBooks since LazyLoadingList handles data loading

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              ref={searchInputRef}
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
              onKeyDown={e => {
                if (e.key === "Escape") {
                  setSearchQuery("")
                }
              }}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                {t('filters')}
                {hasActiveFilters && (
                  <Badge
                    variant="secondary"
                    className="ml-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
                  >
                    {
                      [
                        searchQuery.trim(),
                        selectedGenre,
                        selectedAuthor,
                        selectedStatus
                      ].filter(Boolean).length
                    }
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('filterByGenre')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSelectedGenre("")}>
                <span className={selectedGenre === "" ? "font-medium" : ""}>
                  {t('allGenres')}
                </span>
              </DropdownMenuItem>
              {filters.genres.map(genre => (
                <DropdownMenuCheckboxItem
                  key={genre}
                  checked={selectedGenre === genre}
                  onCheckedChange={checked =>
                    setSelectedGenre(checked ? genre : "")
                  }
                >
                  {genre}
                </DropdownMenuCheckboxItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t('filterByAuthor')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSelectedAuthor("")}>
                <span className={selectedAuthor === "" ? "font-medium" : ""}>
                  {t('allAuthors')}
                </span>
              </DropdownMenuItem>
              {filters.authors.map(author => (
                <DropdownMenuCheckboxItem
                  key={author}
                  checked={selectedAuthor === author}
                  onCheckedChange={checked =>
                    setSelectedAuthor(checked ? author : "")
                  }
                >
                  {author}
                </DropdownMenuCheckboxItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t('filterByStatus')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSelectedStatus("")}>
                <span className={selectedStatus === "" ? "font-medium" : ""}>
                  {t('allStatuses')}
                </span>
              </DropdownMenuItem>
              {filters.analysisStatuses.map(status => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={selectedStatus === status}
                  onCheckedChange={checked =>
                    setSelectedStatus(checked ? status : "")
                  }
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
            <span className="text-sm text-gray-600">{t('sortBy')}:</span>
            <Select
              value={sortBy}
              onValueChange={(value: SortBy) => setSortBy(value)}
            >
              <SelectTrigger className="min-w-32 w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">{t('titleSort')}</SelectItem>
                <SelectItem value="author">{t('author')}</SelectItem>
                <SelectItem value="genre">{t('genre')}</SelectItem>
                <SelectItem value="createdAt">{t('uploadDate')}</SelectItem>
                <SelectItem value="updatedAt">{t('lastUpdated')}</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={toggleSortOrder}>
              {sortOrder === "asc" ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="text-sm text-gray-500">
            {t('searchResults')}
          </div>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600">{t('activeFilters')}:</span>

            {searchQuery.trim() && (
              <Badge variant="secondary" className="gap-1">
                {t('search')}: "{searchQuery}"
                <button
                  onClick={() => setSearchQuery("")}
                  className="ml-1 rounded hover:bg-gray-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {selectedGenre && (
              <Badge variant="secondary" className="gap-1">
                {t('genre')}: {selectedGenre}
                <button
                  onClick={() => setSelectedGenre("")}
                  className="ml-1 rounded hover:bg-gray-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {selectedAuthor && (
              <Badge variant="secondary" className="gap-1">
                {t('author')}: {selectedAuthor}
                <button
                  onClick={() => setSelectedAuthor("")}
                  className="ml-1 rounded hover:bg-gray-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {selectedStatus && (
              <Badge variant="secondary" className="gap-1">
                {t('statusLabel')}: {getStatusText(selectedStatus)}
                <button
                  onClick={() => setSelectedStatus("")}
                  className="ml-1 rounded hover:bg-gray-200"
                >
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
              {t('clearAll')}
            </Button>
          </div>
        )}
      </div>

      {/* Lazy Loading Book List */}
      <LazyLoadingList
        loadDataAction={loadBooks}
        renderItemAction={(book: Book) => (
          <div
            key={book.id}
            className="rounded-lg border p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="truncate text-lg font-semibold text-gray-900">
                    {book.title}
                  </h3>
                  <Badge className={getStatusColor(book.analysisStatus)}>
                    {getStatusText(book.analysisStatus)}
                  </Badge>
                </div>

                {/* Action buttons below the badge */}
                <div className="mb-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onBookSelect?.(book)}
                    data-testid={`view-details-${book.id}`}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {t('viewDetails')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => confirmRename(book)}
                    data-testid={`rename-book-${book.id}`}
                    disabled={renamingBookId === book.id}
                  >
                    {renamingBookId === book.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Edit3 className="mr-2 h-4 w-4" />
                    )}
                    {renamingBookId === book.id ? t('renaming') : t('rename')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => confirmDelete(book)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    data-testid={`delete-book-${book.id}`}
                    disabled={deletingBookId === book.id}
                  >
                    {deletingBookId === book.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    {deletingBookId === book.id ? t('deleting') : t('delete')}
                  </Button>
                </div>

                <div className="space-y-2">
                  {book.author && (
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="mr-1 h-4 w-4" />
                      {book.author}
                    </div>
                  )}

                  {book.genre && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Tag className="mr-1 h-4 w-4" />
                      {book.genre}
                    </div>
                  )}

                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="mr-1 h-4 w-4" />
                    {t('uploaded')}{" "}
                    {formatDistanceToNow(new Date(book.createdAt), {
                      addSuffix: true
                    })}
                  </div>

                  <div className="text-sm text-gray-500">
                    {t('file')}: {book.fileName}{" "}
                    {book.fileSize && `(${book.fileSize})`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        renderSkeleton={() => <BookSkeleton />}
        renderEmpty={() => (
          <div className="py-12 text-center">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              {t('noBooksFound')}
            </h3>
            <p className="text-gray-500">
              {t('adjustSearch')}
            </p>
          </div>
        )}
        renderError={(error, retry) => (
          <div className="py-12 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              {t('failedToLoad')}
            </h3>
            <p className="mb-4 text-gray-500">{error.message}</p>
            <Button onClick={retry}>{t('tryAgain')}</Button>
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
            <DialogTitle>{t('deleteBook')}</DialogTitle>
            <DialogDescription>
              {t('deleteConfirmation')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deletingBookId !== null}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => bookToDelete && handleDeleteBook(bookToDelete.id)}
              disabled={deletingBookId !== null}
            >
              {deletingBookId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('deleting')}
                </>
              ) : (
                t('deleteBook')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Book Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('renameBook')}</DialogTitle>
            <DialogDescription>
              Modifica il titolo e l'autore del libro nel database.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="new-title" className="text-sm font-medium">
                {t('newTitle')} *
              </label>
              <Input
                id="new-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t('titleRequired')}
                disabled={renamingBookId !== null}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-author" className="text-sm font-medium">
                {t('newAuthor')}
              </label>
              <Input
                id="new-author"
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                placeholder="Nome dell'autore"
                disabled={renamingBookId !== null}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRenameDialog(false)}
              disabled={renamingBookId !== null}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleRenameBook}
              disabled={renamingBookId !== null || !newTitle.trim()}
            >
              {renamingBookId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('renaming')}
                </>
              ) : (
                t('save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
