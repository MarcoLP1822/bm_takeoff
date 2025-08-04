"use client"

import { motion } from "framer-motion"
import { Star } from "lucide-react"
import { SectionWrapper } from "./section-wrapper"

interface SocialProofSectionClientProps {
  translations: {
    title: string
    subtitle: string
  }
}

const testimonials = [
  {
    name: "Alex Chen",
    role: "Indie Hacker",
    content:
      "This template saved me weeks of setup time. I went from idea to deployed MVP in just 2 days. The authentication and payment integration alone would have taken me a week to configure properly.",
    rating: 5
  },
  {
    name: "Sarah Williams",
    role: "Startup Founder",
    content:
      "As a non-technical founder, this template was a godsend. Clean code, great documentation, and everything just works out of the box. My developer was impressed with the code quality.",
    rating: 5
  },
  {
    name: "Mike Johnson",
    role: "Full Stack Developer",
    content:
      "I've tried many boilerplates, but this one hits different. Modern stack, best practices, and actually production-ready. It's now my go-to starting point for all client projects.",
    rating: 5
  }
]

export function SocialProofSectionClient({ translations }: SocialProofSectionClientProps) {
  return (
    <SectionWrapper>
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

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              className="bg-card border-border rounded-2xl border p-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 text-yellow-500 fill-current"
                  />
                ))}
              </div>
              <blockquote className="text-card-foreground text-sm leading-6">
                "{testimonial.content}"
              </blockquote>
              <div className="mt-6">
                <div className="text-card-foreground font-semibold">
                  {testimonial.name}
                </div>
                <div className="text-muted-foreground text-sm">
                  {testimonial.role}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
