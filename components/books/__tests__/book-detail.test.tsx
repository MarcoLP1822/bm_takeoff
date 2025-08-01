import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { BookDetail } from "../book-detail"

// Mock fetch
global.fetch = jest.fn()

const mockBookDetail = {
  id: "1",
  title: "Test Book",
  author: "Test Author",
  genre: "Fiction",
  fileName: "test.pdf",
  fileSize: "2.5 MB",
  analysisStatus: "completed" as const,
  analysisData: {
    themes: ["Love", "Adventure", "Growth"],
    quotes: ["Quote 1", "Quote 2"],
    summary: "This is a test book summary."
  },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  hasTextContent: true,
  textContentLength: 50000
}

describe("BookDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders loading state initially", () => {
    ;(fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

    render(<BookDetail bookId="1" />)

    // Check for skeleton elements by class name since they don't have test IDs
    const skeletons = document.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("renders book details correctly", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ book: mockBookDetail })
    }
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

    render(<BookDetail bookId="1" />)

    await waitFor(() => {
      expect(screen.getAllByText("Test Book")).toHaveLength(2) // Header and book info section
      expect(screen.getByText("Test Author")).toBeInTheDocument()
      expect(screen.getByText("Fiction")).toBeInTheDocument()
      expect(screen.getByText("test.pdf")).toBeInTheDocument()
      expect(screen.getByText("Analysis Complete")).toBeInTheDocument()
    })
  })

  it("shows analysis results when completed", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ book: mockBookDetail })
    }
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

    render(<BookDetail bookId="1" />)

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument() // Themes count
      expect(screen.getByText("2")).toBeInTheDocument() // Quotes count
      expect(
        screen.getByText("This is a test book summary.")
      ).toBeInTheDocument()
      expect(screen.getByText("Love")).toBeInTheDocument()
      expect(screen.getByText("Adventure")).toBeInTheDocument()
    })
  })

  it("shows start analysis button for pending books", async () => {
    const pendingBook = {
      ...mockBookDetail,
      analysisStatus: "pending" as const,
      analysisData: null
    }
    const mockResponse = {
      ok: true,
      json: async () => ({ book: pendingBook })
    }
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

    render(<BookDetail bookId="1" />)

    await waitFor(() => {
      expect(screen.getByText("Analysis Not Started")).toBeInTheDocument()
      expect(screen.getAllByText("Start Analysis")).toHaveLength(2) // One in main area, one in sidebar
    })
  })

  it("shows processing state during analysis", async () => {
    const processingBook = {
      ...mockBookDetail,
      analysisStatus: "processing" as const,
      analysisData: null
    }
    const mockResponse = {
      ok: true,
      json: async () => ({ book: processingBook })
    }
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

    render(<BookDetail bookId="1" />)

    await waitFor(() => {
      expect(screen.getAllByText("Analyzing Content...")).toHaveLength(2) // Badge and main content
      expect(
        screen.getByText(
          "This may take a few minutes depending on the book length."
        )
      ).toBeInTheDocument()
    })
  })

  it("shows retry button for failed analysis", async () => {
    const failedBook = {
      ...mockBookDetail,
      analysisStatus: "failed" as const,
      analysisData: null
    }
    const mockResponse = {
      ok: true,
      json: async () => ({ book: failedBook })
    }
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

    render(<BookDetail bookId="1" />)

    await waitFor(() => {
      expect(screen.getAllByText("Analysis Failed")).toHaveLength(2) // Badge and main content
      expect(screen.getByText("Retry Analysis")).toBeInTheDocument()
    })
  })

  it("starts analysis when button is clicked", async () => {
    const pendingBook = {
      ...mockBookDetail,
      analysisStatus: "pending" as const,
      analysisData: null
    }
    const mockResponse = {
      ok: true,
      json: async () => ({ book: pendingBook })
    }
    const analyzeResponse = {
      ok: true,
      json: async () => ({ success: true })
    }
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce(analyzeResponse)
      .mockResolvedValueOnce(mockResponse) // Refetch after analysis

    render(<BookDetail bookId="1" />)

    await waitFor(() => {
      expect(screen.getAllByText("Start Analysis")).toHaveLength(2)
    })

    const startButtons = screen.getAllByText("Start Analysis")
    fireEvent.click(startButtons[0]) // Click the first one

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/books/1/analyze", {
        method: "POST"
      })
    })
  })

  it("calls onBack when back button is clicked", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ book: mockBookDetail })
    }
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

    const onBack = jest.fn()
    render(<BookDetail bookId="1" onBack={onBack} />)

    await waitFor(() => {
      expect(screen.getByText("Back to Library")).toBeInTheDocument()
    })

    const backButton = screen.getByText("Back to Library")
    fireEvent.click(backButton)

    expect(onBack).toHaveBeenCalled()
  })

  it("shows error state when book not found", async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error("Book not found"))

    render(<BookDetail bookId="1" />)

    await waitFor(() => {
      expect(screen.getByText("Book not found")).toBeInTheDocument()
    })
  })
})
