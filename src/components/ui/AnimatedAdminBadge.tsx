'use client';

import React from 'react';
import { motion } from 'framer-motion';

const AnimatedAdminBadge = () => {
  // Variabel Animasi untuk Staggering (Muncul bergantian)
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.4, // Jeda antar huruf
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        duration: 1.2,
        ease: [0.43, 0.13, 0.23, 0.96], // Custom cinematic easing
      }
    }
  };

  const fillVariants = {
    hidden: { fill: "rgba(255, 255, 255, 0)" },
    visible: {
      fill: "rgba(255, 255, 255, 1)",
      transition: { delay: 2, duration: 0.8 } // Muncul setelah garis selesai
    }
  };

  return (
    <motion.span
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="admin-badge-premium"
      style={{
        background: 'linear-gradient(135deg, #1f3cff, #bc13fe)',
        color: 'white',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '10px',
        marginLeft: '5px',
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: 'middle',
        lineHeight: '1',
        fontWeight: '900',
        boxShadow: '0 0 15px rgba(31, 60, 255, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        letterSpacing: '0.5px',
        overflow: 'hidden'
      }}
    >
      {/* Ikon Perisai dengan Animasi Rotasi Halus */}
      <motion.svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ marginRight: '4px' }}
        animate={{ 
          rotateY: [0, 180, 360],
          filter: ["drop-shadow(0 0 0px blue)", "drop-shadow(0 0 4px white)", "drop-shadow(0 0 0px blue)"]
        }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </motion.svg>

      {/* SVG Tulisan "DEV" yang Digambar */}
      <svg width="28" height="12" viewBox="0 0 60 20" style={{ overflow: 'visible' }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#glow)">
          {/* Huruf D */}
          <motion.path
            variants={pathVariants}
            fill="none"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            d="M10 4v12 M10 4c10 0 12 4 12 6s-2 6-12 6"
          />
          {/* Huruf E */}
          <motion.path
            variants={pathVariants}
            fill="none"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            d="M28 4v12 M28 4h10 M28 10h8 M28 16h10"
          />
          {/* Huruf V */}
          <motion.path
            variants={pathVariants}
            fill="none"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            d="M45 4l5 12 5-12"
          />
        </g>
      </svg>
    </motion.span>
  );
};

export default AnimatedAdminBadge;
