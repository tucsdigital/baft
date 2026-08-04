"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { BlogPost, Categoria, Paquete } from "@/types";
import Navbar from "@/components/Navbar";
import HomeHero from "@/components/home/HomeHero";
import HomeFooter from "@/components/home/HomeFooter";
import ProductsSection from "@/components/sections/ProductsSection";
import CategoriesSection from "@/components/sections/CategoriesSection";
import ServicesSection from "@/components/sections/ServicesSection";
import ValuesSection from "@/components/sections/ValuesSection";
import AboutSection from "@/components/sections/AboutSection";
import ContactSectionBlock from "@/components/sections/ContactSectionBlock";
import { renderTemplate, siteConfig } from "@/lib/siteConfig";

interface HomeClientProps {
  paquetes: Paquete[];
  productosOrdenados: Array<
    | { tipo: "paquete"; paquete: Paquete }
    | { tipo: "subtitle"; titulo: string }
  >;
  categoriasDestacadas: Categoria[];
  banners: string[];
  blogPosts: BlogPost[];
}

const fadeInUpVariants = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const fadeInDownVariants = {
  hidden: { opacity: 0, y: -60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const fadeInLeftVariants = {
  hidden: { opacity: 0, x: -60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const fadeInRightVariants = {
  hidden: { opacity: 0, x: 60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const staggerFastVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const fadeInScaleVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 24 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.85,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export default function HomeClient({
  paquetes,
  productosOrdenados,
  categoriasDestacadas,
  banners,
}: HomeClientProps) {
  const [packagesLoading, setPackagesLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setPackagesLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <Navbar variant="homeMockup" reserveSpace />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainerVariants}
      >
        <motion.div variants={fadeInUpVariants}>
          <HomeHero paquetes={paquetes} backgroundImage={banners?.[0] || null} />
        </motion.div>
      </motion.div>

      <ProductsSection
        items={productosOrdenados}
        filterType="paquete"
        sectionBadge={siteConfig.content.packagesSection.badge}
        sectionTitle={siteConfig.content.packagesSection.title}
        sectionSubtitle={renderTemplate(siteConfig.content.packagesSection.subtitleTemplate)}
        loading={packagesLoading}
        fadeInLeftVariants={fadeInLeftVariants}
        fadeInRightVariants={fadeInRightVariants}
        fadeInUpVariants={fadeInUpVariants}
        fadeInDownVariants={fadeInDownVariants}
        fadeInScaleVariants={fadeInScaleVariants}
        staggerFastVariants={staggerFastVariants}
      />

      <CategoriesSection
        categorias={categoriasDestacadas ?? []}
        fadeInUpVariants={fadeInUpVariants}
        staggerFastVariants={staggerFastVariants}
      />

      <ServicesSection
        fadeInUpVariants={fadeInUpVariants}
        staggerFastVariants={staggerFastVariants}
        staggerContainerVariants={staggerContainerVariants}
        scaleInVariants={fadeInScaleVariants}
      />

      <ValuesSection
        fadeInUpVariants={fadeInUpVariants}
        staggerFastVariants={staggerFastVariants}
        staggerContainerVariants={staggerContainerVariants}
        scaleInVariants={fadeInScaleVariants}
      />

      <AboutSection
        fadeInLeftVariants={fadeInLeftVariants}
        fadeInRightVariants={fadeInRightVariants}
        staggerFastVariants={staggerFastVariants}
        staggerContainerVariants={staggerContainerVariants}
      />

      <ContactSectionBlock
        fadeInLeftVariants={fadeInLeftVariants}
        fadeInRightVariants={fadeInRightVariants}
        fadeInUpVariants={fadeInUpVariants}
        fadeInDownVariants={fadeInDownVariants}
        fadeInScaleVariants={fadeInScaleVariants}
        staggerFastVariants={staggerFastVariants}
      />

      <HomeFooter />
    </div>
  );
}
