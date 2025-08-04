"use client"

import { PricingButton } from "@/components/payments/pricing-button"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Check, CreditCard, Zap } from "lucide-react"
import { SectionWrapper } from "./section-wrapper"

interface PricingSectionClientProps {
  translations: {
    title: string
    subtitle: string
    free: {
      title: string
      price: string
      period: string
      description: string
      cta: string
    }
    pro: {
      title: string
      price: string
      period: string
      description: string
      cta: string
    }
  }
}

export function PricingSectionClient({ translations }: PricingSectionClientProps) {
  const pricing = [
    {
      name: translations.free.title,
      price: translations.free.price,
      period: translations.free.period,
      description: translations.free.description,
      features: [
        "Complete source code",
        "Basic authentication",
        "Database setup",
        "Community support"
      ],
      cta: translations.free.cta,
      paymentLink: null,
      icon: CreditCard,
      highlight: false
    },
    {
      name: translations.pro.title,
      price: translations.pro.price,
      period: translations.pro.period,
      description: translations.pro.description,
      features: [
        "Everything in Free",
        "Premium components",
        "Advanced features",
        "Priority support"
      ],
      cta: translations.pro.cta,
      paymentLink: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_YEARLY,
      icon: Zap,
      highlight: true
    }
  ]

  return (
    <SectionWrapper id="pricing">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h2
            className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {translations.title}
          </motion.h2>
          <motion.p
            className="text-muted-foreground mt-4 text-lg leading-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {translations.subtitle}
          </motion.p>
        </div>

        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-2">
          {pricing.map((tier, index) => (
            <motion.div
              key={tier.name}
              className={`relative rounded-3xl p-8 ring-1 ${
                tier.highlight
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-card text-card-foreground ring-border"
              }`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: index * 0.1
              }}
            >
              {tier.highlight && (
                <motion.div
                  className="absolute -top-4 left-1/2 -translate-x-1/2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <span className="bg-primary text-primary-foreground inline-flex items-center rounded-full px-4 py-1 text-xs font-semibold">
                    BEST VALUE
                  </span>
                </motion.div>
              )}

              <div className="flex items-center gap-4">
                <tier.icon
                  className={`h-8 w-8 ${
                    tier.highlight ? "text-primary-foreground" : "text-primary"
                  }`}
                />
                <h3
                  className={`text-lg leading-8 font-semibold ${
                    tier.highlight
                      ? "text-primary-foreground"
                      : "text-foreground"
                  }`}
                >
                  {tier.name}
                </h3>
              </div>

              <p
                className={`mt-4 text-sm leading-6 ${
                  tier.highlight
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground"
                }`}
              >
                {tier.description}
              </p>

              <p className="mt-6 flex items-baseline gap-x-1">
                <span
                  className={`text-4xl font-bold tracking-tight ${
                    tier.highlight
                      ? "text-primary-foreground"
                      : "text-foreground"
                  }`}
                >
                  {tier.price}
                </span>
                <span
                  className={`text-sm leading-6 font-semibold ${
                    tier.highlight
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  }`}
                >
                  {tier.period}
                </span>
              </p>

              <ul
                className={`mt-8 space-y-3 text-sm leading-6 ${
                  tier.highlight
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground"
                }`}
              >
                {tier.features.map(feature => (
                  <li key={feature} className="flex gap-x-3">
                    <Check
                      className={`h-6 w-5 flex-none ${
                        tier.highlight
                          ? "text-primary-foreground"
                          : "text-primary"
                      }`}
                      aria-hidden="true"
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              {tier.paymentLink ? (
                <PricingButton
                  paymentLink={tier.paymentLink}
                  className={`mt-8 w-full ${
                    tier.highlight
                      ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                      : ""
                  }`}
                  variant={tier.highlight ? "default" : "outline"}
                >
                  {tier.cta}
                </PricingButton>
              ) : (
                <Button
                  className={`mt-8 w-full ${
                    tier.highlight
                      ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                      : ""
                  }`}
                  variant={tier.highlight ? "default" : "outline"}
                >
                  {tier.cta}
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
