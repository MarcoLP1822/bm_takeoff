import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ContentEditor, GeneratedPost } from "../content-editor"

// Mock timers for debounce testing
jest.useFakeTimers()

const mockPost: GeneratedPost = {
  id: "test-post-1",
  platform: "twitter",
  content: "This is a test tweet about a great book!",
  hashtags: ["#books", "#reading"],
  characterCount: 40,
  isValid: true,
  validationErrors: []
}

const mockOnSaveAction = jest.fn()
const mockOnAutoSaveAction = jest.fn()

describe("ContentEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.useFakeTimers()
  })

  it("renders content editor with post data", () => {
    render(
      <ContentEditor
        post={mockPost}
        onSaveAction={mockOnSaveAction}
        onAutoSaveAction={mockOnAutoSaveAction}
      />
    )

    expect(screen.getByDisplayValue(mockPost.content)).toBeInTheDocument()
    expect(screen.getByDisplayValue("#books #reading")).toBeInTheDocument()
    expect(screen.getByText("Twitter/X")).toBeInTheDocument()
    expect(screen.getByText("40/280")).toBeInTheDocument()
  })

  it("shows character count and validation status", () => {
    render(<ContentEditor post={mockPost} onSaveAction={mockOnSaveAction} />)

    expect(screen.getByText("40/280")).toBeInTheDocument()
    expect(screen.getByText("2/5")).toBeInTheDocument() // hashtag count
  })

  it("validates content length for different platforms", () => {
    const longContent = "a".repeat(300) // Exceeds Twitter limit
    const invalidPost: GeneratedPost = {
      ...mockPost,
      content: longContent,
      characterCount: 300,
      isValid: false,
      validationErrors: ["Content exceeds 280 character limit by 20 characters"]
    }

    render(<ContentEditor post={invalidPost} onSaveAction={mockOnSaveAction} />)

    expect(screen.getByText("300/280")).toBeInTheDocument()
    expect(
      screen.getByText(/Content exceeds 280 character limit/)
    ).toBeInTheDocument()
  })

  it("validates hashtag limits", () => {
    const tooManyHashtags = Array.from({ length: 10 }, (_, i) => `#tag${i}`)
    const invalidPost: GeneratedPost = {
      ...mockPost,
      hashtags: tooManyHashtags,
      isValid: false,
      validationErrors: ["Too many hashtags (10/5)"]
    }

    render(<ContentEditor post={invalidPost} onSaveAction={mockOnSaveAction} />)

    expect(screen.getByText("10/5")).toBeInTheDocument()
    expect(screen.getByText(/Too many hashtags/)).toBeInTheDocument()
  })

  it("calls onSaveAction when save button is clicked", async () => {
    const user = userEvent.setup()

    render(<ContentEditor post={mockPost} onSaveAction={mockOnSaveAction} />)

    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    expect(mockOnSaveAction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockPost.id,
        platform: mockPost.platform,
        content: mockPost.content
      })
    )
  }, 10000)

  it("updates content and triggers auto-save", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(
      <ContentEditor
        post={mockPost}
        onSaveAction={mockOnSaveAction}
        onAutoSaveAction={mockOnAutoSaveAction}
        autoSaveDelay={100}
      />
    )

    const contentTextarea = screen.getByDisplayValue(mockPost.content)
    await user.clear(contentTextarea)
    await user.type(contentTextarea, "Updated content")

    // Fast-forward time to trigger auto-save
    jest.advanceTimersByTime(100)

    await waitFor(() => {
      expect(mockOnAutoSaveAction).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Updated content"
        })
      )
    })
  })

  it("updates hashtags correctly", async () => {
    const user = userEvent.setup()

    render(<ContentEditor post={mockPost} onSaveAction={mockOnSaveAction} />)

    const hashtagTextarea = screen.getByDisplayValue("#books #reading")
    await user.clear(hashtagTextarea)
    await user.type(hashtagTextarea, "#newbook #amazing #mustread")

    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    expect(mockOnSaveAction).toHaveBeenCalledWith(
      expect.objectContaining({
        hashtags: ["#newbook", "#amazing", "#mustread"]
      })
    )
  }, 10000)

  it("shows platform-specific preview for Twitter", () => {
    render(<ContentEditor post={mockPost} onSaveAction={mockOnSaveAction} />)

    expect(screen.getByText("Preview")).toBeInTheDocument()
    expect(screen.getByText("@username")).toBeInTheDocument()
    expect(screen.getByText("Your Name")).toBeInTheDocument()
  })

  it("shows platform-specific preview for Instagram", () => {
    const instagramPost: GeneratedPost = {
      ...mockPost,
      platform: "instagram"
    }

    render(
      <ContentEditor post={instagramPost} onSaveAction={mockOnSaveAction} />
    )

    expect(screen.getByText("Instagram")).toBeInTheDocument()
    expect(screen.getAllByText("your_username")).toHaveLength(2)
  })

  it("shows platform-specific preview for LinkedIn", () => {
    const linkedinPost: GeneratedPost = {
      ...mockPost,
      platform: "linkedin"
    }

    render(
      <ContentEditor post={linkedinPost} onSaveAction={mockOnSaveAction} />
    )

    expect(screen.getByText("LinkedIn")).toBeInTheDocument()
    expect(screen.getByText("Your Title")).toBeInTheDocument()
  })

  it("shows platform-specific preview for Facebook", () => {
    const facebookPost: GeneratedPost = {
      ...mockPost,
      platform: "facebook"
    }

    render(
      <ContentEditor post={facebookPost} onSaveAction={mockOnSaveAction} />
    )

    expect(screen.getByText("Facebook")).toBeInTheDocument()
    expect(screen.getByText("Just now")).toBeInTheDocument()
  })

  it("displays image URL when provided", () => {
    const postWithImage: GeneratedPost = {
      ...mockPost,
      imageUrl: "https://example.com/image.jpg"
    }

    render(
      <ContentEditor post={postWithImage} onSaveAction={mockOnSaveAction} />
    )

    expect(screen.getByText("Suggested Image")).toBeInTheDocument()
    expect(
      screen.getByText("https://example.com/image.jpg")
    ).toBeInTheDocument()
  })

  it("disables save button when no changes", () => {
    render(<ContentEditor post={mockPost} onSaveAction={mockOnSaveAction} />)

    const saveButton = screen.getByRole("button", { name: /save/i })
    expect(saveButton).toBeDisabled()
  })

  it("enables save button when content changes", async () => {
    const user = userEvent.setup()

    render(<ContentEditor post={mockPost} onSaveAction={mockOnSaveAction} />)

    const contentTextarea = screen.getByDisplayValue(mockPost.content)
    await user.type(contentTextarea, " Updated!")

    const saveButton = screen.getByRole("button", { name: /save/i })
    expect(saveButton).toBeEnabled()
  }, 10000)

  it("shows validation errors in alert", () => {
    const invalidPost: GeneratedPost = {
      ...mockPost,
      isValid: false,
      validationErrors: [
        "Content exceeds 280 character limit by 20 characters",
        "Too many hashtags (10/5)"
      ]
    }

    render(<ContentEditor post={invalidPost} onSaveAction={mockOnSaveAction} />)

    expect(
      screen.getByText(/Content exceeds 280 character limit/)
    ).toBeInTheDocument()
    expect(screen.getByText(/Too many hashtags/)).toBeInTheDocument()
  })

  it("formats hashtags correctly in preview", () => {
    const postWithHashtags: GeneratedPost = {
      ...mockPost,
      hashtags: ["books", "#reading", "literature"]
    }

    render(
      <ContentEditor post={postWithHashtags} onSaveAction={mockOnSaveAction} />
    )

    // Should show hashtags with # prefix in preview
    expect(screen.getByText("#books #reading #literature")).toBeInTheDocument()
  })
})
