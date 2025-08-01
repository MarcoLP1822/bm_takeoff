import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { BookUpload } from "../book-upload"

// Mock fetch
global.fetch = jest.fn()

// Mock file for testing
const createMockFile = (name: string, size: number, type: string) => {
  const file = new File(["test content"], name, { type })
  Object.defineProperty(file, "size", { value: size })
  return file
}

describe("BookUpload", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders upload interface correctly", () => {
    render(<BookUpload />)

    expect(screen.getByText("Drag & drop a book file here")).toBeInTheDocument()
    expect(screen.getByText("or click to browse")).toBeInTheDocument()
    expect(
      screen.getByText("Supported formats: PDF, EPUB, TXT, DOCX")
    ).toBeInTheDocument()
    expect(screen.getByText("Maximum file size: 50MB")).toBeInTheDocument()
  })

  it("shows success state after successful upload", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ book: { id: "1", title: "Test Book" } })
    }
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

    const onUploadSuccess = jest.fn()
    render(<BookUpload onUploadSuccess={onUploadSuccess} />)

    const file = createMockFile("test.pdf", 1000000, "application/pdf")
    const input = screen.getByRole("textbox", { hidden: true })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText("Upload successful!")).toBeInTheDocument()
    })

    expect(onUploadSuccess).toHaveBeenCalledWith({
      id: "1",
      title: "Test Book"
    })
  })

  it("shows error for unsupported file types", async () => {
    render(<BookUpload />)

    const file = createMockFile("test.jpg", 1000000, "image/jpeg")
    const input = screen.getByRole("textbox", { hidden: true })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/Invalid file type/)).toBeInTheDocument()
    })
  })

  it("shows error for files that are too large", async () => {
    render(<BookUpload />)

    const file = createMockFile("test.pdf", 60 * 1024 * 1024, "application/pdf") // 60MB
    const input = screen.getByRole("textbox", { hidden: true })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/File is too large/)).toBeInTheDocument()
    })
  })

  it("handles upload errors correctly", async () => {
    const mockResponse = {
      ok: false,
      json: async () => ({ error: "Upload failed" })
    }
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

    const onUploadError = jest.fn()
    render(<BookUpload onUploadError={onUploadError} />)

    const file = createMockFile("test.pdf", 1000000, "application/pdf")
    const input = screen.getByRole("textbox", { hidden: true })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText("Upload failed")).toBeInTheDocument()
    })

    expect(onUploadError).toHaveBeenCalledWith("Upload failed")
  })
})
