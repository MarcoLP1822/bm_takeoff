import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { PublishingInterface } from "../publishing-interface"
import { toast } from "sonner"

// Mock dependencies
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

// Mock fetch
global.fetch = jest.fn()

const mockToast = toast as jest.Mocked<typeof toast>

describe("PublishingInterface", () => {
  const mockProps = {
    contentId: "content-123",
    content: "Test post content",
    platform: "twitter",
    accounts: [
      {
        id: "account-1",
        platform: "twitter",
        accountName: "Test Account 1",
        accountHandle: "testaccount1",
        isActive: true
      },
      {
        id: "account-2",
        platform: "twitter",
        accountName: "Test Account 2",
        accountHandle: "testaccount2",
        isActive: true
      },
      {
        id: "account-3",
        platform: "instagram",
        accountName: "Instagram Account",
        accountHandle: "instaaccount",
        isActive: true
      }
    ],
    onPublishSuccess: jest.fn(),
    onScheduleSuccess: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.MockedFunction<typeof fetch>).mockClear()
  })

  it("should render platform-specific accounts only", () => {
    render(<PublishingInterface {...mockProps} />)

    expect(screen.getByText("Test Account 1")).toBeInTheDocument()
    expect(screen.getByText("Test Account 2")).toBeInTheDocument()
    expect(screen.queryByText("Instagram Account")).not.toBeInTheDocument()
  })

  it("should show message when no accounts are available", () => {
    render(<PublishingInterface {...mockProps} accounts={[]} />)

    expect(screen.getByText("No twitter accounts connected")).toBeInTheDocument()
    expect(screen.getByText("Connect your twitter account to publish content")).toBeInTheDocument()
  })

  it("should allow selecting and deselecting accounts", () => {
    render(<PublishingInterface {...mockProps} />)

    const checkbox1 = screen.getByRole("checkbox", { name: /test account 1/i })
    const checkbox2 = screen.getByRole("checkbox", { name: /test account 2/i })

    expect(checkbox1).not.toBeChecked()
    expect(checkbox2).not.toBeChecked()

    fireEvent.click(checkbox1)
    expect(checkbox1).toBeChecked()

    fireEvent.click(checkbox2)
    expect(checkbox2).toBeChecked()

    fireEvent.click(checkbox1)
    expect(checkbox1).not.toBeChecked()
  })

  it("should disable publish button when no accounts selected", () => {
    render(<PublishingInterface {...mockProps} />)

    const publishButton = screen.getByRole("button", { name: /publish now/i })
    expect(publishButton).toBeDisabled()
  })

  it("should enable publish button when accounts are selected", () => {
    render(<PublishingInterface {...mockProps} />)

    const checkbox = screen.getByRole("checkbox", { name: /test account 1/i })
    fireEvent.click(checkbox)

    const publishButton = screen.getByRole("button", { name: /publish now/i })
    expect(publishButton).not.toBeDisabled()
  })

  it("should publish successfully", async () => {
    const mockResponse = {
      success: true,
      results: [
        {
          success: true,
          contentId: "content-123",
          accountId: "account-1",
          platform: "twitter",
          socialPostId: "tweet-123"
        }
      ],
      summary: {
        total: 1,
        successful: 1,
        failed: 0
      }
    }

    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response)

    render(<PublishingInterface {...mockProps} />)

    const checkbox = screen.getByRole("checkbox", { name: /test account 1/i })
    fireEvent.click(checkbox)

    const publishButton = screen.getByRole("button", { name: /publish now/i })
    fireEvent.click(publishButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/social/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contentId: "content-123",
          accountIds: ["account-1"]
        })
      })
    })

    expect(mockToast.success).toHaveBeenCalledWith("Published to 1 account")
    expect(mockProps.onPublishSuccess).toHaveBeenCalled()
  })

  it("should handle publish failures", async () => {
    const mockResponse = {
      success: false,
      results: [
        {
          success: false,
          contentId: "content-123",
          accountId: "account-1",
          platform: "twitter",
          error: "API rate limit exceeded"
        }
      ],
      summary: {
        total: 1,
        successful: 0,
        failed: 1
      }
    }

    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response)

    render(<PublishingInterface {...mockProps} />)

    const checkbox = screen.getByRole("checkbox", { name: /test account 1/i })
    fireEvent.click(checkbox)

    const publishButton = screen.getByRole("button", { name: /publish now/i })
    fireEvent.click(publishButton)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to publish to 1 account")
    })
  })

  it("should handle mixed success and failure", async () => {
    const mockResponse = {
      success: true,
      results: [
        {
          success: true,
          contentId: "content-123",
          accountId: "account-1",
          platform: "twitter",
          socialPostId: "tweet-123"
        },
        {
          success: false,
          contentId: "content-123",
          accountId: "account-2",
          platform: "twitter",
          error: "Account suspended"
        }
      ],
      summary: {
        total: 2,
        successful: 1,
        failed: 1
      }
    }

    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response)

    render(<PublishingInterface {...mockProps} />)

    const checkbox1 = screen.getByRole("checkbox", { name: /test account 1/i })
    const checkbox2 = screen.getByRole("checkbox", { name: /test account 2/i })
    fireEvent.click(checkbox1)
    fireEvent.click(checkbox2)

    const publishButton = screen.getByRole("button", { name: /publish now/i })
    fireEvent.click(publishButton)

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Published to 1 account")
      expect(mockToast.error).toHaveBeenCalledWith("Failed to publish to 1 account")
    })
  })

  it("should schedule post successfully", async () => {
    const mockResponse = {
      success: true,
      message: "Post scheduled successfully",
      scheduledAt: "2024-12-25T10:00:00.000Z"
    }

    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response)

    render(<PublishingInterface {...mockProps} />)

    const checkbox = screen.getByRole("checkbox", { name: /test account 1/i })
    fireEvent.click(checkbox)

    const dateInput = screen.getByLabelText(/date/i)
    const timeInput = screen.getByLabelText(/time/i)
    
    fireEvent.change(dateInput, { target: { value: "2024-12-25" } })
    fireEvent.change(timeInput, { target: { value: "10:00" } })

    const scheduleButton = screen.getByRole("button", { name: /schedule post/i })
    fireEvent.click(scheduleButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/social/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: expect.stringContaining("2024-12-25T10:00")
      })
    })

    expect(mockToast.success).toHaveBeenCalledWith("Post scheduled successfully")
    expect(mockProps.onScheduleSuccess).toHaveBeenCalled()
  })

  it("should validate scheduling inputs", async () => {
    render(<PublishingInterface {...mockProps} />)

    const checkbox = screen.getByRole("checkbox", { name: /test account 1/i })
    fireEvent.click(checkbox)

    const scheduleButton = screen.getByRole("button", { name: /schedule post/i })
    fireEvent.click(scheduleButton)

    expect(mockToast.error).toHaveBeenCalledWith("Please select date and time")
  })

  it("should show retry button for failed publications", async () => {
    const mockResponse = {
      success: false,
      results: [
        {
          success: false,
          contentId: "content-123",
          accountId: "account-1",
          platform: "twitter",
          error: "Temporary API error"
        }
      ],
      summary: {
        total: 1,
        successful: 0,
        failed: 1
      }
    }

    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response)

    render(<PublishingInterface {...mockProps} />)

    const checkbox = screen.getByRole("checkbox", { name: /test account 1/i })
    fireEvent.click(checkbox)

    const publishButton = screen.getByRole("button", { name: /publish now/i })
    fireEvent.click(publishButton)

    await waitFor(() => {
      expect(screen.getByText("Temporary API error")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument()
    })
  })

  it("should handle retry successfully", async () => {
    // First publish fails
    const failedResponse = {
      success: false,
      results: [
        {
          success: false,
          contentId: "content-123",
          accountId: "account-1",
          platform: "twitter",
          error: "Temporary error"
        }
      ],
      summary: { total: 1, successful: 0, failed: 1 }
    }

    // Retry succeeds
    const retryResponse = {
      success: true,
      result: {
        success: true,
        contentId: "content-123",
        accountId: "account-1",
        platform: "twitter",
        socialPostId: "tweet-retry-123"
      }
    }

    ;(fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(failedResponse)
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(retryResponse)
      } as Response)

    render(<PublishingInterface {...mockProps} />)

    const checkbox = screen.getByRole("checkbox", { name: /test account 1/i })
    fireEvent.click(checkbox)

    const publishButton = screen.getByRole("button", { name: /publish now/i })
    fireEvent.click(publishButton)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument()
    })

    const retryButton = screen.getByRole("button", { name: /retry/i })
    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/social/retry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contentId: "content-123",
          accountId: "account-1"
        })
      })
    })

    expect(mockToast.success).toHaveBeenCalledWith("Publication retry successful")
  })
})