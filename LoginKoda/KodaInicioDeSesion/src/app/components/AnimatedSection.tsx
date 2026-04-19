import React, { ReactNode, useEffect, useRef } from 'react';
import { motion, Variants, useAnimation, useInView } from 'framer-motion';

// mismos variants que definimos en App pero los podemos reexportar si hace falta
export const sectionContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      when: 'beforeChildren',
    },
  },
};

export const sectionItem: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Envuelve un grupo de elementos y los anima con "slide-up + fade-in".
 *
 * La animación se dispara automáticamente cuando el contenedor entra en
 * el viewport (scroll) y sólo ocurre una vez thanks a `once: true`.
 *
 * Útil para listas, cards, secciones de la página, etc. Si quieres que la
 * animación se repita al cambiar de vista basta con renderizar el componente
 * con una `key` diferente (por ejemplo, en App con `viewKey`).
 */
export default function AnimatedSection({ children, className }: AnimatedSectionProps) {
  const controls = useAnimation();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  useEffect(() => {
    if (inView) controls.start('visible');
  }, [inView, controls]);

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={sectionContainer}
      initial="hidden"
      animate={controls}
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={sectionItem}>{child}</motion.div>
      ))}
    </motion.div>
  );
}
