"use client"

import { motion } from "framer-motion"
import { Play, Timer, Zap } from "lucide-react"
import { useState } from "react"
import { SectionWrapper } from "./section-wrapper"

interface VideoSectionClientProps {
  translations: {
    title: string
    subtitle: string
    playButton: string
  }
}

export function VideoSectionClient({ translations }: VideoSectionClientProps) {
  const [isHovered, setIsHovered] = useState(false)

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

        {/* Video Preview */}
        <motion.div
          className="relative mx-auto mt-16 max-w-4xl"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <div
            className="bg-gradient-to-br from-primary/10 to-secondary/10 relative aspect-video overflow-hidden rounded-2xl"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Video Placeholder */}
            <div className="bg-muted absolute inset-0 flex items-center justify-center">
              <motion.button
                className="bg-primary/90 hover:bg-primary flex items-center justify-center rounded-full p-6 backdrop-blur-sm transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={isHovered ? { scale: 1.02 } : { scale: 1 }}
              >
                <Play className="text-primary-foreground ml-1 h-8 w-8 fill-current" />
              </motion.button>
            </div>

            {/* Video Overlay Content */}
            <div className="absolute inset-0 flex flex-col justify-between p-8">
              <div className="flex items-start justify-between">
                <div className="bg-background/80 rounded-full px-3 py-1 backdrop-blur-sm">
                  <span className="text-foreground text-sm font-medium">
                    {translations.playButton}
                  </span>
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <h3 className="text-background text-xl font-semibold drop-shadow-lg">
                    Complete Setup Guide
                  </h3>
                  <p className="text-background/80 text-sm drop-shadow">
                    From clone to deploy in under 5 minutes
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="bg-background/20 flex items-center gap-2 rounded-full px-3 py-1 backdrop-blur-sm">
                    <Timer className="text-background h-4 w-4" />
                    <span className="text-background text-sm">4:32</span>
                  </div>
                  <div className="bg-background/20 flex items-center gap-2 rounded-full px-3 py-1 backdrop-blur-sm">
                    <Zap className="text-background h-4 w-4" />
                    <span className="text-background text-sm">Setup</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits below video */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                icon: Timer,
                title: "5 Min Setup",
                description: "Get up and running in minutes"
              },
              {
                icon: Zap,
                title: "Zero Config",
                description: "Everything works out of the box"
              },
              {
                icon: Play,
                title: "Step by Step",
                description: "Follow along with the video guide"
              }
            ].map((benefit, index) => (
              <motion.div
                key={benefit.title}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
              >
                <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                  <benefit.icon className="text-primary h-6 w-6" />
                </div>
                <h4 className="text-foreground font-semibold">
                  {benefit.title}
                </h4>
                <p className="text-muted-foreground text-sm">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
