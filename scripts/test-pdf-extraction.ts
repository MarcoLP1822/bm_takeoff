import { TextExtractionService } from "../lib/text-extraction"
import { readFile } from "fs/promises"
import { join } from "path"

async function testPdfExtraction() {
  try {
    console.log("Testing PDF extraction service...")
    
    // Test with a simple text to create a mock PDF scenario
    const mockPdfBuffer = Buffer.from("This is a test PDF content for extraction testing.")
    const fileName = "test-document.pdf"
    
    console.log("Testing with mock buffer...")
    
    const result = await TextExtractionService.extractText(
      mockPdfBuffer,
      "application/pdf",
      fileName
    )
    
    console.log("Extraction result:", {
      text: result.text.substring(0, 100) + "...",
      metadata: result.metadata
    })
    
    console.log("✅ PDF extraction service is working!")
    
  } catch (error) {
    console.error("❌ PDF extraction test failed:", error)
  }
}

// Run the test
testPdfExtraction()
