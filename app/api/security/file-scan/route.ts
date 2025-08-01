import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { FileSecurityService } from "@/lib/file-security"
import {
  createSecurityMiddleware,
  addSecurityHeaders
} from "@/lib/security-middleware"

const securityMiddleware = createSecurityMiddleware({
  enableRateLimit: true,
  enableInputValidation: false,
  enableFileScanning: false, // We'll handle file scanning manually
  enableGDPRLogging: true,
  rateLimiter: "upload"
})

export async function POST(req: NextRequest) {
  // Apply security middleware
  const securityResult = await securityMiddleware(req)
  if (securityResult) return securityResult

  try {
    const { userId } = await auth()

    if (!userId) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Authentication required" }, { status: 401 })
      )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return addSecurityHeaders(
        NextResponse.json({ error: "No file provided" }, { status: 400 })
      )
    }

    // Perform comprehensive security scan
    const scanResult = await FileSecurityService.performSecurityScan(file, {
      enableVirusScanning: true,
      enableContentScanning: true,
      enableHashValidation: true,
      quarantineThreats: true,
      maxScanSize: 50 * 1024 * 1024 // 50MB
    })

    // Generate security report
    const securityReport = FileSecurityService.generateSecurityReport(
      scanResult,
      file.name
    )

    if (!scanResult.passed) {
      // Quarantine file if threats detected
      if (scanResult.quarantined) {
        await FileSecurityService.quarantineFile(file, scanResult)
      }

      return addSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            scanResult,
            securityReport,
            message: "File failed security scan"
          },
          { status: 400 }
        )
      )
    }

    return addSecurityHeaders(
      NextResponse.json({
        success: true,
        scanResult,
        securityReport,
        message: "File passed security scan",
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        }
      })
    )
  } catch (error) {
    console.error("File security scan error:", error)
    return addSecurityHeaders(
      NextResponse.json({ error: "File security scan failed" }, { status: 500 })
    )
  }
}
