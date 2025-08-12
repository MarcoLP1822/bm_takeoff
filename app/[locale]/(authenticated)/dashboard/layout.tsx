import { getCustomerByUserId, createCustomer } from "@/actions/customers"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import DashboardClientLayout from "./_components/layout-client"
import { type Locale } from "@/i18n"

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: Locale }>
}

export default async function DashboardLayout({ children, params }: Props) {
  // Await the params object
  const { locale } = await params

  try {
    const { userId } = await auth()

    if (!userId) {
      redirect(`/${locale}/login`)
    }

    // Get user details from Clerk
    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)

    const customer = await getCustomerByUserId(userId)

    // Se il customer non esiste, crealo automaticamente
    let finalCustomer = customer
    if (!customer) {
      const createResult = await createCustomer(userId)
      if (createResult.isSuccess && createResult.data) {
        finalCustomer = createResult.data
      }
    }

    // Gate dashboard access for pro members only
    // Store a message to show why they were redirected
    if (!finalCustomer || finalCustomer.membership !== "pro") {
      // Using searchParams to pass a message that can be read by client components
      redirect(`/${locale}/?redirect=dashboard#pricing`)
    }

    const userData = {
      name:
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.firstName || user.username || "User",
      email: user.emailAddresses[0]?.emailAddress || "",
      avatar: user.imageUrl,
      membership: finalCustomer.membership,
      onboardingCompleted: finalCustomer.onboardingCompleted
    }

    return (
      <DashboardClientLayout userData={userData} locale={locale}>
        {children}
      </DashboardClientLayout>
    )
  } catch (error) {
    console.error("Dashboard layout error:", error)
    redirect(`/${locale}/login`)
  }
}
