'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';

const AnimatedAdminBadge = () => {
  const pathVariants: Variants = {
    hidden: {
      pathLength: 0,
      opacity: 0,
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        duration: 2,
        ease: [0.45, 0, 0.55, 1],
        repeat: Infinity,
        repeatType: 'mirror',    // 💫 tulis → hapus → tulis …
        repeatDelay: 0,         // 🚫 tanpa jeda
      },
    },
  };

  return (
    <motion.span
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="admin-badge-clean"
      style={{
        background: 'linear-gradient(135deg, #1f3cff, #bc13fe)',
        color: 'white',
        padding: '2px 10px',
        borderRadius: '4px',
        fontSize: '10px',
        marginLeft: '5px',
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: 'middle',
        lineHeight: '1',
        fontWeight: '500',
        border: 'none',              // ❌ hilangkan efek shadow
        overflow: 'hidden',
        boxShadow: 'none',
      }}
    >
      {/* Ikon perisai */}
      <motion.svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ marginRight: '5px' }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </motion.svg>

      {/* Tanda tangan "DEV" */}
      <svg width="26" height="12" viewBox="0 0 60 20" style={{ overflow: 'visible' }}>
        <g>
          {/* D */}
          <motion.path
            variants={pathVariants}
            initial="hidden"
            animate="visible"
            fill="none"
            stroke="white"
            strokeWidth="1.5"       // ✒️ tipis seperti pulpen
            strokeLinecap="round"
            d="M10 4v12 M10 4c10 0 12 4 12 6s-2 6-12 6"
          />
          {/* E */}
          <motion.path
            variants={pathVariants}
            initial="hidden"
            animate="visible"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            d="M28 4v12 M28 4h8 M28 10h6 M28 16h8"
          />
          {/* V */}
          <motion.path
            variants={pathVariants}
            initial="hidden"
            animate="visible"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            d="M45 4l5 12 5-12"
          />
        </g>
      </svg>
    </motion.span>
  );
};

export default AnimatedAdminBadge;