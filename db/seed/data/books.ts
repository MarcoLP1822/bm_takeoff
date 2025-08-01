import { InsertBook } from "../../schema/books"

export const booksData: InsertBook[] = [
  {
    userId: "user_test_1",
    title: "The Art of War",
    author: "Sun Tzu",
    genre: "Philosophy",
    fileUrl: "https://example.com/art-of-war.pdf",
    fileName: "art-of-war.pdf",
    fileSize: "2.5MB",
    textContent: "Sample text content from The Art of War...",
    analysisStatus: "completed",
    analysisData: {
      themes: ["Strategy", "Leadership", "Warfare"],
      keyQuotes: [
        "All warfare is based on deception.",
        "The supreme excellence is to subdue the enemy without fighting."
      ],
      summary: "A classic treatise on military strategy and tactics.",
      insights: [
        "Strategic thinking",
        "Leadership principles",
        "Competitive advantage"
      ]
    }
  },
  {
    userId: "user_test_1",
    title: "Atomic Habits",
    author: "James Clear",
    genre: "Self-Help",
    fileUrl: "https://example.com/atomic-habits.pdf",
    fileName: "atomic-habits.pdf",
    fileSize: "3.2MB",
    textContent: "Sample text content from Atomic Habits...",
    analysisStatus: "completed",
    analysisData: {
      themes: ["Habits", "Personal Development", "Productivity"],
      keyQuotes: [
        "You do not rise to the level of your goals. You fall to the level of your systems.",
        "Every action you take is a vote for the type of person you wish to become."
      ],
      summary:
        "A comprehensive guide to building good habits and breaking bad ones.",
      insights: ["Habit formation", "Identity-based habits", "Systems thinking"]
    }
  },
  {
    userId: "user_test_2",
    title: "1984",
    author: "George Orwell",
    genre: "Dystopian Fiction",
    fileUrl: "https://example.com/1984.pdf",
    fileName: "1984.pdf",
    fileSize: "4.1MB",
    textContent: "Sample text content from 1984...",
    analysisStatus: "processing",
    analysisData: null
  }
]
