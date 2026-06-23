import { motion, useReducedMotion } from "framer-motion";

export function PageTransition({ children }) {
  const shouldReduceMotion = useReducedMotion();

  const variants = {
    initial: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 15,
    },
    enter: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.25,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : -10,
      transition: {
        duration: 0.15,
        ease: "easeIn",
      },
    },
  };

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        width: "100%",
        minHeight: "100%",
      }}
    >
      {children}
    </motion.div>
  );
}
