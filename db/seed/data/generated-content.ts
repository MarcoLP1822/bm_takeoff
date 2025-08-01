import { InsertGeneratedContent } from "../../schema/generated-content"

export const generatedContentData: InsertGeneratedContent[] = [
  {
    bookId: "book_id_1", // This will be replaced with actual book IDs during seeding
    userId: "user_test_1",
    platform: "twitter",
    contentType: "post",
    content:
      "🧠 'All warfare is based on deception' - Sun Tzu reminds us that strategy isn't just about force, but about intelligence and misdirection. How do you apply strategic thinking in your daily life? #Strategy #Leadership #ArtOfWar",
    hashtags: [
      "#Strategy",
      "#Leadership",
      "#ArtOfWar",
      "#SunTzu",
      "#Philosophy"
    ],
    status: "draft"
  },
  {
    bookId: "book_id_1",
    userId: "user_test_1",
    platform: "linkedin",
    contentType: "post",
    content:
      "Strategic Leadership Insight from The Art of War:\n\n'The supreme excellence is to subdue the enemy without fighting.'\n\nThis ancient wisdom applies perfectly to modern business. The best leaders resolve conflicts through:\n• Clear communication\n• Strategic positioning\n• Win-win solutions\n\nWhat's your approach to conflict resolution in the workplace?",
    hashtags: [
      "#Leadership",
      "#Strategy",
      "#BusinessWisdom",
      "#ConflictResolution"
    ],
    status: "published",
    publishedAt: new Date("2024-01-15T10:00:00Z"),
    socialPostId: "linkedin_post_123"
  },
  {
    bookId: "book_id_2",
    userId: "user_test_1",
    platform: "instagram",
    contentType: "post",
    content:
      "✨ Habit transformation starts with identity ✨\n\n'Every action you take is a vote for the type of person you wish to become.' - James Clear\n\nStop focusing on what you want to achieve. Start focusing on who you want to become. 🌱\n\n#AtomicHabits #PersonalGrowth #Mindset #Habits #SelfImprovement #Motivation",
    hashtags: [
      "#AtomicHabits",
      "#PersonalGrowth",
      "#Mindset",
      "#Habits",
      "#SelfImprovement",
      "#Motivation"
    ],
    imageUrl: "https://example.com/habit-quote-image.jpg",
    status: "scheduled",
    scheduledAt: new Date("2024-01-20T15:30:00Z")
  },
  {
    bookId: "book_id_2",
    userId: "user_test_1",
    platform: "facebook",
    contentType: "post",
    content:
      "🎯 The Power of Systems Over Goals\n\nJames Clear's 'Atomic Habits' teaches us something revolutionary: 'You do not rise to the level of your goals. You fall to the level of your systems.'\n\nThis means:\n→ Goals are about the results you want to achieve\n→ Systems are about the processes that lead to those results\n→ Focus on building better systems, not just setting bigger goals\n\nWhat system are you building today to support your long-term success?\n\n#AtomicHabits #ProductivityTips #PersonalDevelopment #Success #Habits",
    hashtags: [
      "#AtomicHabits",
      "#ProductivityTips",
      "#PersonalDevelopment",
      "#Success",
      "#Habits"
    ],
    status: "draft"
  }
]
