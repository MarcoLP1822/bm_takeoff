import { SelectCustomer } from "@/db/schema/customers"
import { getTranslations } from "next-intl/server"
import { HeaderClient } from "./header-client"

interface HeaderProps {
  userMembership: SelectCustomer["membership"] | null
}

export async function Header({ userMembership }: HeaderProps) {
  const t = await getTranslations("marketing.navigation")
  
  const navigation = [
    { name: t("about"), href: "/about" },
    { name: t("features"), href: "/features" },
    { name: t("pricing"), href: "/pricing" },
    { name: t("contact"), href: "/contact" }
  ]

  return <HeaderClient navigation={navigation} userMembership={userMembership} />
}
