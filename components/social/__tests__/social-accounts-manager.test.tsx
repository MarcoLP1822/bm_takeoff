import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { SocialAccountsManager } from "../social-accounts-manager"
import { toast } from "sonner"

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

// Mock fetch
global.fetch = jest.fn()

// Mock window.location
Object.defineProperty(window, "location", {
  value: {
    href: "",
    search: "",
    pathname: "/dashboard/settings"
  },
  writable: true
})

// Mock window.history
Object.defineProperty(window, "history", {
  value: {
    replaceState: jest.fn()
  },
  writable: true
})

describe("SocialAccountsManager", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  it("should render loading state initially", () => {
    ;(fetch as jest.Mock).mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<SocialAccountsManager />)

    expect(screen.getByText("Social Media Accounts")).toBeInTheDocument()
    // Should show loading skeletons
    expect(document.querySelectorAll(".animate-pulse")).toHaveLength(4) // One for each platform
  })

  it("should render social media platforms", async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ accounts: [] })
    })

    render(<SocialAccountsManager />)

    await waitFor(() => {
      expect(screen.getByText("Twitter/X")).toBeInTheDocument()
      expect(screen.getByText("Instagram")).toBeInTheDocument()
      expect(screen.getByText("LinkedIn")).toBeInTheDocument()
      expect(screen.getByText("Facebook")).toBeInTheDocument()
    })

    // Should show connect buttons for all platforms
    expect(screen.getByText("Connect Twitter/X")).toBeInTheDocument()
    expect(screen.getByText("Connect Instagram")).toBeInTheDocument()
    expect(screen.getByText("Connect LinkedIn")).toBeInTheDocument()
    expect(screen.getByText("Connect Facebook")).toBeInTheDocument()
  })

  it("should display connected accounts", async () => {
    const mockAccounts = [
      {
        id: "1",
        platform: "twitter",
        accountId: "123456789",
        accountName: "Test User",
        accountHandle: "testuser",
        isActive: true,
        tokenExpiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01")
      }
    ]

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ accounts: mockAccounts })
    })

    render(<SocialAccountsManager />)

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument()
      expect(screen.getByText("@testuser")).toBeInTheDocument()
      expect(screen.getByText("active")).toBeInTheDocument()
      expect(screen.getByText("Disconnect")).toBeInTheDocument()
    })
  })

  it("should display expired token warning", async () => {
    const mockAccounts = [
      {
        id: "1",
        platform: "twitter",
        accountId: "123456789",
        accountName: "Test User",
        accountHandle: "testuser",
        isActive: true,
        tokenExpiresAt: new Date(Date.now() - 1000), // Expired
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01")
      }
    ]

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ accounts: mockAccounts })
    })

    render(<SocialAccountsManager />)

    await waitFor(() => {
      expect(screen.getByText("expired")).toBeInTheDocument()
      expect(screen.getByText("Reconnect")).toBeInTheDocument()
      expect(
        screen.getByText(
          "Your access token has expired. Please reconnect your account to continue publishing."
        )
      ).toBeInTheDocument()
    })
  })

  it("should handle connect button click", async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accounts: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            authUrl: "https://twitter.com/oauth/authorize?..."
          })
      })

    render(<SocialAccountsManager />)

    await waitFor(() => {
      expect(screen.getByText("Connect Twitter/X")).toBeInTheDocument()
    })

    const connectButton = screen.getByText("Connect Twitter/X")
    fireEvent.click(connectButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/social/connect/twitter")
    })
  })

  it("should handle disconnect button click", async () => {
    const mockAccounts = [
      {
        id: "1",
        platform: "twitter",
        accountId: "123456789",
        accountName: "Test User",
        accountHandle: "testuser",
        isActive: true,
        tokenExpiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01")
      }
    ]

    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accounts: mockAccounts })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accounts: [] })
      })

    render(<SocialAccountsManager />)

    await waitFor(() => {
      expect(screen.getByText("Disconnect")).toBeInTheDocument()
    })

    const disconnectButton = screen.getByText("Disconnect")
    fireEvent.click(disconnectButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/social/accounts/1", {
        method: "DELETE"
      })
      expect(toast.success).toHaveBeenCalledWith("Disconnected Twitter/X")
    })
  })

  it("should handle OAuth callback success", () => {
    // Mock URL with success parameter
    Object.defineProperty(window, "location", {
      value: {
        search: "?connected=twitter",
        pathname: "/dashboard/settings"
      },
      writable: true
    })
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ accounts: [] })
    })

    render(<SocialAccountsManager />)

    expect(toast.success).toHaveBeenCalledWith(
      "Successfully connected Twitter/X"
    )
    expect(window.history.replaceState).toHaveBeenCalledWith(
      {},
      "",
      "/dashboard/settings"
    )
  })

  it("should handle OAuth callback error", () => {
    // Mock URL with error parameter
    Object.defineProperty(window, "location", {
      value: {
        search: "?error=User%20denied%20access",
        pathname: "/dashboard/settings"
      },
      writable: true
    })
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ accounts: [] })
    })

    render(<SocialAccountsManager />)

    expect(toast.error).toHaveBeenCalledWith("User denied access")
    expect(window.history.replaceState).toHaveBeenCalledWith(
      {},
      "",
      "/dashboard/settings"
    )
  })

  it("should handle API errors", async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"))

    render(<SocialAccountsManager />)

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load social media accounts")
      ).toBeInTheDocument()
    })
  })

  it("should handle connect API error", async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accounts: [] })
      })
      .mockRejectedValueOnce(new Error("Connect failed"))

    render(<SocialAccountsManager />)

    await waitFor(() => {
      expect(screen.getByText("Connect Twitter/X")).toBeInTheDocument()
    })

    const connectButton = screen.getByText("Connect Twitter/X")
    fireEvent.click(connectButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to connect Twitter/X")
    })
  })

  it("should handle disconnect API error", async () => {
    const mockAccounts = [
      {
        id: "1",
        platform: "twitter",
        accountId: "123456789",
        accountName: "Test User",
        accountHandle: "testuser",
        isActive: true,
        tokenExpiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01")
      }
    ]

    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accounts: mockAccounts })
      })
      .mockRejectedValueOnce(new Error("Disconnect failed"))

    render(<SocialAccountsManager />)

    await waitFor(() => {
      expect(screen.getByText("Disconnect")).toBeInTheDocument()
    })

    const disconnectButton = screen.getByText("Disconnect")
    fireEvent.click(disconnectButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to disconnect Twitter/X")
    })
  })
})
