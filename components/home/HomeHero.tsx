"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import HeroSearch from "@/components/HeroSearch";
import type { Paquete } from "@/types";
import { siteConfig } from "@/lib/siteConfig";

type Props = {
  paquetes: Paquete[];
  backgroundImage?: string | null;
};

export default function HomeHero({ paquetes, backgroundImage }: Props) {
  const hero = siteConfig.content.homeHero;
  const bg = backgroundImage || hero.backgroundImage || "/images/hero-placeholder.svg";

  return (
    <section className="relative isolate overflow-hidden">
      <div className="relative min-h-[420px] pb-8 sm:min-h-[500px] sm:pb-10 md:min-h-[580px] md:pb-12 lg:min-h-[640px] lg:pb-14">
        <Image
          src={bg}
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/60" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white via-white/70 to-transparent" />

        <div className="relative z-10 container mx-auto flex min-h-[420px] items-end justify-center px-4 pb-4 pt-16 sm:min-h-[500px] sm:pb-5 sm:pt-20 md:min-h-[580px] md:px-6 md:pb-8 md:pt-24 lg:min-h-[640px] lg:px-8 lg:pb-10 lg:pt-28">
          <motion.div
            className="w-full max-w-5xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              className="relative"
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 4.5, ease: "easeInOut", repeat: Infinity }}
            >
              <HeroSearch paquetes={paquetes} />
              <div className="absolute -bottom-6 left-1/2 -z-10 h-14 w-[88%] -translate-x-1/2 rounded-[100%] bg-black/20 blur-2xl" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
