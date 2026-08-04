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
    <section className="relative isolate overflow-x-hidden overflow-y-visible">
      <div className="relative min-h-[420px] sm:min-h-[500px] md:min-h-[580px] lg:min-h-[640px]">
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

        <div className="relative z-10 container mx-auto flex min-h-[420px] items-center justify-center px-4 py-10 sm:min-h-[500px] sm:py-12 md:min-h-[580px] md:px-6 md:py-16 lg:min-h-[640px] lg:px-8 lg:py-20">
          <motion.div
            className="w-full max-w-5xl max-[360px]:translate-y-10 min-[361px]:max-[375px]:translate-y-12 min-[376px]:max-[425px]:translate-y-14 min-[426px]:max-[767px]:translate-y-16 md:translate-y-12 lg:translate-y-16"
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
