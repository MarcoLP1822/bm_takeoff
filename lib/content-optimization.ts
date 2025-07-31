import { Platform, PLATFORM_CONFIGS, GeneratedPost } from './content-generation'

/**
 * Optimize content for better engagement
 */
export function optimizeContent(content: string, platform: Platform): string {
  let optimized = content.trim()
  
  // Platform-specific optimizations
  switch (platform) {
    case 'twitter':
      // Add line breaks for readability
      optimized = optimized.replace(/\. /g, '.\n\n')
      // Ensure it ends with a call to action or question
      if (!optimized.match(/[?!]$/)) {
        optimized += ' 📚'
      }
      break
      
    case 'instagram':
      // Add emojis for visual appeal
      optimized = addEmojis(optimized)
      // Add line breaks for better formatting
      optimized = optimized.replace(/\. /g, '.\n\n')
      break
      
    case 'linkedin':
      // Professional formatting with bullet points if applicable
      if (optimized.includes(',') && optimized.length > 200) {
        optimized = formatWithBulletPoints(optimized)
      }
      break
      
    case 'facebook':
      // Longer form content with paragraphs
      optimized = optimized.replace(/\. /g, '.\n\n')
      break
  }
  
  return optimized
}

/**
 * Add relevant emojis to content
 */
function addEmojis(content: string): string {
  const emojiMap: Record<string, string> = {
    'book': '📚',
    'read': '📖',
    'quote': '💭',
    'wisdom': '🧠',
    'inspiration': '✨',
    'love': '❤️',
    'success': '🎯',
    'journey': '🚀',
    'learn': '🎓',
    'think': '💡',
    'question': '❓',
    'amazing': '🤩',
    'powerful': '💪',
    'beautiful': '🌟'
  }
  
  let enhanced = content
  
  // Add emojis based on keywords
  Object.entries(emojiMap).forEach(([keyword, emoji]) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
    if (regex.test(enhanced) && !enhanced.includes(emoji)) {
      enhanced = enhanced.replace(regex, `${keyword} ${emoji}`)
    }
  })
  
  return enhanced
}

/**
 * Format content with bullet points for better readability
 */
function formatWithBulletPoints(content: string): string {
  // Split by commas or semicolons and create bullet points
  const sentences = content.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0)
  
  if (sentences.length > 2) {
    const intro = sentences[0]
    const points = sentences.slice(1).map(point => `• ${point}`)
    return `${intro}:\n\n${points.join('\n')}`
  }
  
  return content
}

/**
 * Suggest content improvements
 */
export function suggestImprovements(post: GeneratedPost): string[] {
  const suggestions: string[] = []
  const config = PLATFORM_CONFIGS[post.platform]
  
  // Character count suggestions
  if (post.characterCount > config.maxLength * 0.9) {
    suggestions.push('Consider shortening the content to leave room for engagement')
  }
  
  if (post.characterCount < config.maxLength * 0.3) {
    suggestions.push('Content could be expanded for better engagement')
  }
  
  // Hashtag suggestions
  if (post.hashtags.length < 3 && post.platform !== 'twitter') {
    suggestions.push('Consider adding more relevant hashtags')
  }
  
  if (post.hashtags.length > config.hashtagLimit * 0.8) {
    suggestions.push('Consider reducing hashtags to avoid appearing spammy')
  }
  
  // Content quality suggestions
  if (!post.content.match(/[?!]/)) {
    suggestions.push('Consider adding a question or call-to-action to increase engagement')
  }
  
  if (post.platform === 'instagram' && !post.content.includes('📚') && !post.content.includes('📖')) {
    suggestions.push('Consider adding book-related emojis for visual appeal')
  }
  
  if (post.platform === 'linkedin' && post.content.length > 500 && !post.content.includes('\n')) {
    suggestions.push('Consider adding line breaks for better readability')
  }
  
  return suggestions
}

/**
 * Auto-fix common content issues
 */
export function autoFixContent(post: GeneratedPost): GeneratedPost {
  let fixedContent = post.content
  let fixedHashtags = [...post.hashtags]
  
  // Remove duplicate hashtags
  fixedHashtags = [...new Set(fixedHashtags)]
  
  // Ensure hashtags start with #
  fixedHashtags = fixedHashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`)
  
  // Remove invalid characters from hashtags
  fixedHashtags = fixedHashtags.map(tag => tag.replace(/[^#a-zA-Z0-9]/g, ''))
  
  // Optimize content
  fixedContent = optimizeContent(fixedContent, post.platform)
  
  // Recalculate character count
  const hashtagText = fixedHashtags.length > 0 ? ' ' + fixedHashtags.join(' ') : ''
  const totalContent = fixedContent + hashtagText
  const characterCount = totalContent.length
  
  // Check if fixes resolved validation issues
  const config = PLATFORM_CONFIGS[post.platform]
  const isValid = characterCount <= config.maxLength && fixedHashtags.length <= config.hashtagLimit
  const validationErrors = []
  
  if (characterCount > config.maxLength) {
    validationErrors.push(`Content exceeds ${config.maxLength} character limit`)
  }
  
  if (fixedHashtags.length > config.hashtagLimit) {
    validationErrors.push(`Too many hashtags (${fixedHashtags.length}/${config.hashtagLimit})`)
  }
  
  return {
    ...post,
    content: fixedContent,
    hashtags: fixedHashtags,
    characterCount,
    isValid,
    validationErrors
  }
}

/**
 * Generate content preview for different platforms
 */
export function generateContentPreview(post: GeneratedPost): {
  preview: string
  displayLength: number
  truncated: boolean
} {
  const config = PLATFORM_CONFIGS[post.platform]
  const hashtagText = post.hashtags.length > 0 ? ' ' + post.hashtags.join(' ') : ''
  const fullContent = post.content + hashtagText
  
  // Platform-specific preview logic
  let previewLength: number = config.maxLength
  
  if (post.platform === 'twitter') {
    previewLength = 280
  } else if (post.platform === 'instagram') {
    previewLength = 125 // Instagram shows first ~125 chars before "more"
  }
  
  const truncated = fullContent.length > previewLength
  const preview = truncated 
    ? fullContent.slice(0, previewLength - 3) + '...'
    : fullContent
  
  return {
    preview,
    displayLength: fullContent.length,
    truncated
  }
}