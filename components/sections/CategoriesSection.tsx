'use client';

import { useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import CategoriaCard from '@/components/CategoriaCard';
import { Categoria } from '@/types';

interface CategoriesSectionProps {
  categorias: Categoria[];
  fadeInUpVariants: Variants;
  staggerFastVariants: Variants;
}

export default function CategoriesSection({
  categorias,
  fadeInUpVariants,
  staggerFastVariants,
}: CategoriesSectionProps) {
  const [showAllCategorias, setShowAllCategorias] = useState(false);

  return (
    <section id="destinos" className="py-10 md:py-16 bg-[#F9FAFB] overflow-x-hidden">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <motion.div
          className="mb-16 md:mb-20 max-w-3xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-150px" }}
          variants={staggerFastVariants}
        >
          <motion.div className="inline-block mb-4" variants={fadeInUpVariants}>
            <span className="badge-pluma pluma-underline">Destinos</span>
          </motion.div>
          <motion.h2
            className="text-lg md:text-lg lg:text-lg font-bold leading-tight"
            variants={fadeInUpVariants}
          >
            
          </motion.h2>
          <motion.p
            className="text-base md:text-lg text-[#4B5563] leading-relaxed"
            variants={fadeInUpVariants}
          >
            Explorá nuestros destinos destacados y encontrá el viaje perfecto para vos
          </motion.p>
        </motion.div>

        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {categorias.length > 0 ? (
            categorias.map((categoria, index) => (
              <CategoriaCard key={categoria.id} categoria={categoria} index={index} />
            ))
          ) : (
            <motion.div
              className="col-span-full text-center py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-base md:text-lg text-gray-400">
                No hay destinos destacados disponibles
              </p>
            </motion.div>
          )}
        </div>

        <div className="md:hidden space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {categorias.length > 0 ? (
              categorias
                .slice(0, showAllCategorias ? categorias.length : 3)
                .map((categoria, index) => (
                  <CategoriaCard key={categoria.id} categoria={categoria} index={index} />
                ))
            ) : (
              <motion.div
                className="text-center py-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                <p className="text-base md:text-lg text-gray-400">
                  No hay destinos destacados disponibles
                </p>
              </motion.div>
            )}
          </div>

          {categorias.length > 3 && !showAllCategorias && (
            <motion.div
              className="flex justify-center pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <button
                onClick={() => setShowAllCategorias(true)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#D8E7F5] bg-white px-6 py-3 text-sm font-extrabold text-[#112B49] shadow-[0_12px_28px_rgba(17,43,73,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#B7D8EF] hover:bg-[#F8FCFF] hover:text-[#0B7FA5] hover:shadow-[0_16px_34px_rgba(17,43,73,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2BB8BF]/25 focus-visible:ring-offset-2 active:translate-y-0 active:bg-[#F2F9FD]"
              >
                Ver todos los destinos ({categorias.length})
                <ArrowRight className="h-4 w-4 shrink-0" />
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
