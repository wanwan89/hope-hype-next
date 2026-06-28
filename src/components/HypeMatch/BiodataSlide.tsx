'use client';
import React from 'react';

// SvgIcon Standalone dengan Penyesuaian viewBox dan SVG Custom
const SvgIcon = ({ name, value = "", className = "", size = 18, style }: { name: string, value?: string, className?: string, size?: number, style?: React.CSSProperties }) => {
  const strokeWidth = "2";

  // Konfigurasi icon beserta path dan viewBox masing-masing
  const icons: Record<string, { viewBox: string; content: React.ReactNode }> = {
    gender: {
      viewBox: "0 0 24 24",
      content: (
        <g fill="none">
          <path fill="#ff808c" d="M12.95 13.891a3.816 3.816 0 1 0 0-7.632a3.816 3.816 0 0 0 0 7.632" />
          <path fill="#66e1ff" d="M7.21 15.826a3.815 3.815 0 1 0 0-7.63a3.815 3.815 0 0 0 0 7.63" />
          <path stroke="#191919" strokeLinecap="round" strokeLinejoin="round" d="M9.61 14.146a5.26 5.26 0 1 1 3.826 1.18" />
          <path stroke="#191919" strokeLinecap="round" strokeLinejoin="round" d="M10.578 7.952A5.26 5.26 0 1 1 6.74 6.76m10.043-.5L22.044 1m0 3.826V1h-3.826M6.74 17.26V23m-1.913-1.913h3.826" />
        </g>
      ),
    },
    education: {
      viewBox: "0 0 40 40",
      content: (
        <g fill="none" strokeMiterlimit="10">
          <path fill="#ffe236" stroke="#231f20" d="M25.29 5.18c-.43-1.41-3.94-1.87-6-2a12.54 12.54 0 0 0-5.69 1.2a12.64 12.64 0 0 0-5.42-2.11C6.12 2.11 2.58 2 1.94 3.33C1.36 4 1 7.62.77 10.64s-.47 6.68 0 7.41c.42 1.41 3.48.45 6.09.66c1.123.122 2.236.326 3.33.61c.16 1.07 1.38 1.31 2.11 1.37s2 0 2.3-1a25 25 0 0 1 3.39-.1c2.83.22 5.48 1.63 6.12.31c.59-.64.93-4.29 1.17-7.31s.48-6.68.01-7.41Z" />
          <path stroke="#231f20" strokeLinecap="round" d="M10.14 6.54a24.3 24.3 0 0 0-5.72-.45m5.4 4.53a25.5 25.5 0 0 0-5.72-.45m5.38 4.71a25 25 0 0 0-5.72-.46M22.4 7.51a24.4 24.4 0 0 0-5.72-.45m5.4 4.54a25 25 0 0 0-5.72-.46m5.38 4.71a25 25 0 0 0-5.74-.46M13.61 4.35l-.91 11.44" />
          <path stroke="#fff" strokeLinecap="round" d="M22.36 5C24 5.43 24 5.88 24 6.63" />
          <path fill="#ff52a1" stroke="#231f20" d="M30.85 20.38c-2.56-1-6.14-2.14-7.82-1.61c-1.18.14-4.58 2-6.85 3.72s-4.34 4.08-4.2 4.73c0 0 .17 1.57.34 2.79A12.2 12.2 0 0 0 13 33a1.13 1.13 0 0 0 2-.29a11.6 11.6 0 0 0-.21-3.07c0-.16-.17-.08 1.81.72c.46 2.73.89 4.53 1.43 5.32c1 2.53 5.34 2.25 7.83 1.89s6.72-1.3 7-4c.29-.91.2-2.76-.12-5.52c2-1.65 3.66-3.61 3.53-4.19c.32-1.04-2.87-2.49-5.42-3.48Z" />
          <path stroke="#231f20" strokeLinecap="round" d="M19.71 31c2.06.65 4.2 1.12 5.39.75a16.9 16.9 0 0 0 4.75-2.28" />
          <path fill="#fff" stroke="#231f20" d="M22.008 25.42a.76.76 0 0 0 .218.421c.122.126.29.232.494.313s.44.133.694.156c.255.023.523.015.79-.023a3.4 3.4 0 0 0 .763-.2c.238-.093.45-.21.623-.345q.261-.204.386-.44a.76.76 0 0 0 .09-.465a.76.76 0 0 0-.218-.42a1.4 1.4 0 0 0-.494-.313a2.5 2.5 0 0 0-.694-.157a3.4 3.4 0 0 0-.789.024a3.4 3.4 0 0 0-.764.2c-.238.093-.45.21-.622.345a1.4 1.4 0 0 0-.386.439a.76.76 0 0 0-.09.465Z" />
          <path stroke="#fff" strokeLinecap="round" d="M24.81 20.47a9.2 9.2 0 0 1 3.13.73" />
          <path fill="#48eeff" stroke="#231f20" d="M32.53 3.33c.94.26 2.33.67.77 4.49s-2.5 3.59-3 3.46s-1.41-.38-.77-4.49s2.06-3.72 3-3.46Zm-4.46 10.65a1.46 1.46 0 1 0 2.92 0a1.46 1.46 0 0 0-2.92 0Zm10.66-5.25c.64.43 1.58 1.09-.54 3.57s-2.77 2.08-3.09 1.86s-1-.64.54-3.56s2.45-2.29 3.09-1.87Zm-6.11 7.61a1.15 1.15 0 1 0 2.3 0a1.15 1.15 0 0 0-2.3 0Z" />
        </g>
      ),
    },
    height: {
      viewBox: "0 0 512 512",
      content: (
        <path fill="#7c3aed" fillRule="evenodd" d="M384 85.333V42.667H128v42.666h127.999l-79.085 79.085l30.17 30.17l27.583-27.583v178.018l-27.584-27.583l-30.17 30.17l79.057 79.057H128v42.666h256v-42.666H256.027l79.056-79.057l-30.17-30.17l-27.58 27.58V167.007l27.581 27.581l30.17-30.17l-79.085-79.085z" clipRule="evenodd" />
      ),
    },
    zodiac: {
      viewBox: "0 0 14 14",
      content: (
        <path fill="#8fbffa" fillRule="evenodd" d="M1.759 2.357A1 1 0 1 0 .24 3.659l2.123 2.474l.001.001a1.923 1.923 0 0 0 2.808.116l.005-.005L6.972 4.45l1.795 1.795l.005.005a1.923 1.923 0 0 0 2.803-.11l2.176-2.47a1 1 0 1 0-1.502-1.323l-2.13 2.42l-1.781-1.78l-.002-.002a1.923 1.923 0 0 0-2.727 0L3.827 4.767zm0 5.189A1 1 0 1 0 .24 8.848l2.123 2.474h.001a1.92 1.92 0 0 0 2.808.116l.005-.005L6.972 9.64l1.795 1.794l.005.005a1.92 1.92 0 0 0 2.803-.11l2.176-2.47a1 1 0 1 0-1.502-1.322l-2.13 2.42l-1.781-1.78l-.002-.002a1.923 1.923 0 0 0-2.727 0L3.827 9.956z" clipRule="evenodd" />
      ),
    },
    religion: {
      viewBox: "0 0 72 72",
      content: (
        <>
          <path fill="#EDC0A2" d="M44.3 11.6c-.2 0-.5 0-.7.1V6.4c0-2.2-1.8-4-4-4c-1.7 0-3.1 1-3.7 2.4c-.6-1.4-2-2.4-3.7-2.4c-2.2 0-4 1.8-4 4v5.3c-.2 0-.5-.1-.7-.1c-2.2 0-4 1.8-4 4v31.7c0 2.2 1.8 4 4 4c1.1 0 2.2-.5 2.9-1.2c.5.3 1.2.5 1.8.5v.2h10.1c.6.3 1.2.5 2 .5c2.2 0 4-1.8 4-4V15.6c0-2.2-1.7-4-4-4" />
          <path fill="#357BA8" d="M66.7 44.5c-.3-.5-.6-.9-1-1.3c-3.5-3.5-10.8-1.7-16.4 3.9s-7.4 13-3.9 16.4c.3.3.5.5.8.7L54 72h17.8l.2-22.2z" />
          <path fill="#FFD3B6" d="M61.1 42.5c-.2-.4-.5-.8-.9-1.1c-6.8-6-14.5-14.8-14.5-17.9V7.7c0-2.2-1.8-4-4-4s-4 1.8-4 4v32.5c0 12.5 7.3 19.7 7.6 20c.6.5 1.4.9 2.2 1.1h.8c1.8 0 5.5-.7 10-5.2c5.2-5.1 4.2-10.9 2.8-13.6" />
          <path fill="#357BA8" d="M22.6 47.1c-5.6-5.6-13-7.4-16.4-3.9c-.4.4-.7.8-1 1.3l-5.3 5.3L0 72h17.8l7.8-7.8c.3-.2.6-.4.8-.7c3.6-3.5 1.8-10.8-3.8-16.4" />
          <path fill="#FFD3B6" d="M30.2 3.7c-2.2 0-4 1.8-4 4v15.8c0 3.1-7.6 11.9-14.5 17.9c-.4.3-.7.7-.9 1.1c-1.4 2.7-2.4 8.5 2.7 13.7c4.5 4.5 8.2 5.2 10 5.2h.8c.8-.1 1.6-.5 2.2-1.1c.3-.3 7.6-7.4 7.6-20V7.7c.1-2.2-1.7-4-3.9-4" />
          <path fill="#00BEEA" d="M54.5 13.8c.1 0 .1 0 .2-.1l7.1-4c.1-.1.2-.2.2-.3s0-.2-.1-.3L58.8 6c-.1 0-.2-.1-.4 0c-.1 0-.2.1-.3.2l-4 7.1c-.1.2-.1.3.1.5zm-44-4l7.1 4c.1 0 .1.1.2.1c.3 0 .4-.2.4-.4c0-.1 0-.2-.1-.3l-3.9-7c-.1-.2-.2-.2-.3-.2s-.2 0-.3.1l-3.1 3.1c-.1.1-.1.2-.1.3s0 .2.1.3m51.6 8.9c-.1-.1-.2-.1-.3-.1L54 20.8c-.2 0-.3.2-.3.4s.1.3.3.4l7.8 2.2h.1c.1 0 .2 0 .2-.1c.1-.1.2-.2.2-.3V19c-.1-.1-.1-.3-.2-.3m-43.7 2.1l-7.8-2.2c-.1 0-.2 0-.3.1c-.2 0-.3.2-.3.3v4.3c0 .1.1.2.2.3s.2.1.2.1h.1l7.8-2.2c.2 0 .3-.2.3-.4s-.1-.3-.2-.3" />
        </>
      ),
    },
    hobby: {
      viewBox: "0 0 14 14",
      content: (
        <g fill="none" stroke="#eab308" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.77 8.5A5.91 5.91 0 0 1 .5 4.84V1.58a9.65 9.65 0 0 1 8.87 0" />
          <path d="M7.79 13.44h0a2.27 2.27 0 0 1-2-.51h0a6.66 6.66 0 0 1-2.11-6.67l.73-2.92a9.88 9.88 0 0 1 9.09 2.28l-.73 2.91a6.67 6.67 0 0 1-4.98 4.91Z" />
          <path d="M5.61 6.51a1 1 0 0 1 1-.27a1 1 0 0 1 .73.69m2.23.57a1 1 0 0 1 1.7.43" />
        </g>
      ),
    },
    sport: {
      viewBox: "0 0 24 24",
      content: (
        <path fill="#eab308" d="M13 14.55q-2.425 0-3.55.275T7.525 15.9l-3.4 3.4q-.275.275-.687.275t-.713-.275q-.3-.3-.3-.712t.3-.713L6.1 14.5q.775-.775 1.063-1.937T7.45 9q0-1.45.65-2.85t1.85-2.6q2.275-2.275 5.025-2.575T19.5 2.5q1.8 1.8 1.5 4.55t-2.55 5q-1.2 1.2-2.6 1.85t-2.85.65m-2.7-2.9q1.175 1.15 3.175.85t3.575-1.875q1.6-1.6 1.913-3.588T18.1 3.925q-1.2-1.2-3.137-.9t-3.563 1.9Q9.825 6.5 9.488 8.488t.812 3.162m4.875 10.175Q14 20.65 14 19t1.175-2.825T18 15t2.825 1.175T22 19t-1.175 2.825T18 23t-2.825-1.175" />
      ),
    },
    smoke: {
      viewBox: "0 0 14 14",
      content: (
        <g fill="none" fillRule="evenodd" clipRule="evenodd">
          <path fill="#2859c5" d="M6.277 1.204a.75.75 0 0 0-1.46-.346l-.182.77a.99.99 0 0 1-.961.76a2.49 2.49 0 0 0-2.417 1.898l-.177.728a.75.75 0 1 0 1.457.355l.178-.728a.99.99 0 0 1 .959-.754a2.49 2.49 0 0 0 2.42-1.912l.183-.77Zm3.012.54A.75.75 0 1 0 7.91 1.15L6.817 3.687a1.25 1.25 0 0 1-1.148.754h-.558a.75.75 0 0 0 0 1.5h.558a2.75 2.75 0 0 0 2.525-1.66L9.29 1.745Z" />
          <path fill="#8fbffa" d="M1.695 8.377a.75.75 0 0 0-1.491-.161q-.025.22-.06.482c-.063.467-.136 1.017-.136 1.55c0 .532.073 1.082.135 1.55c.024.173.045.336.061.481a.75.75 0 0 0 1.491-.16a24 24 0 0 0-.078-.627c-.057-.427-.11-.817-.11-1.244s.053-.817.11-1.244c.027-.199.054-.405.078-.627m1.525.696c.237-.738.93-1.321 1.77-1.321h6.952c.84 0 1.533.583 1.77 1.321l-.714.23l.714-.23c.1.31.19.657.19 1.174c0 .518-.09.865-.19 1.175c-.237.737-.93 1.32-1.77 1.32H4.99c-.84 0-1.533-.583-1.77-1.32c-.1-.31-.19-.657-.19-1.175c0-.517.09-.864.19-1.174" />
        </g>
      ),
    },
    alcohol: {
      viewBox: "0 0 15 15",
      content: (
        <path fill="#eab308" d="M14 4h-4v3.5a2 2 0 0 0 1.5 1.93V13H11a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1h-.5V9.43A2 2 0 0 0 14 7.5zm-1 3.5a1 1 0 1 1-2 0V5h2zm-7.5-5V2a.5.5 0 0 0 0-1V.5A.5.5 0 0 0 5 0H4a.5.5 0 0 0-.5.5V1a.5.5 0 0 0 0 1v.5C3.5 3.93 1 5.57 1 7v6a1 1 0 0 0 1 1h5a1.1 1.1 0 0 0 1-1V7c0-1.35-2.5-3.15-2.5-4.5m-1 9.5a2.5 2.5 0 1 1 0-5a2.5 2.5 0 0 1 0 5" />
      ),
    },
    ig: {
      viewBox: "0 0 48 48",
      content: (
        <>
          <defs>
            <mask id="IconifyId19f0db75b90ab5fe21">
              <g fill="none">
                <path fill="#fff" stroke="#fff" strokeLinejoin="round" strokeWidth="4" d="M34 6H14a8 8 0 0 0-8 8v20a8 8 0 0 0 8 8h20a8 8 0 0 0 8-8V14a8 8 0 0 0-8-8Z" />
                <path fill="#000" stroke="#000" strokeLinejoin="round" strokeWidth="4" d="M24 32a8 8 0 1 0 0-16a8 8 0 0 0 0 16Z" />
                <path fill="#000" d="M35 15a2 2 0 1 0 0-4a2 2 0 0 0 0 4" />
              </g>
            </mask>
          </defs>
          <path fill="#eab308" d="M0 0h48v48H0z" mask="url(#IconifyId19f0db75b90ab5fe21)" />
        </>
      ),
    },
    tiktok: {
      viewBox: "0 0 1024 1024",
      content: (
        <path fill="#eab308" fillRule="evenodd" d="M530.014 112.667c43.666-.667 86.997-.334 130.328-.667c2.667 51 21 102.999 58.33 138.998c37.332 37 89.997 54 141.328 59.666v134.332c-47.998-1.667-96.33-11.667-139.994-32.333c-19-8.667-36.665-19.667-53.998-31c-.333 97.332.334 194.665-.666 291.663c-2.667 46.666-18 93-44.998 131.332c-43.665 64-119.328 105.665-196.992 106.999c-47.664 2.666-95.329-10.334-135.994-34.333c-67.33-39.666-114.662-112.332-121.661-190.331c-.667-16.667-1-33.333-.334-49.666c6-63.333 37.332-123.999 85.997-165.332c55.33-47.999 132.66-70.999 204.99-57.332c.667 49.333-1.332 98.665-1.332 147.998c-33-10.667-71.664-7.667-100.663 12.333c-20.999 13.667-36.998 34.666-45.331 58.333c-7 17-5 35.666-4.667 53.666c8 54.666 60.664 100.665 116.662 95.665c37.332-.333 72.997-22 92.33-53.666c6.332-11 13.332-22.333 13.665-35.333c3.334-59.666 2-118.998 2.334-178.664c.333-134.332-.334-268.33.666-402.328" />
      ),
    },
    spotify: {
      viewBox: "0 0 24 24",
      content: (
        <path fill="#eab308" d="M17.9 10.9C14.7 9 9.35 8.8 6.3 9.75c-.5.15-1-.15-1.15-.6c-.15-.5.15-1 .6-1.15c3.55-1.05 9.4-.85 13.1 1.35c.45.25.6.85.35 1.3c-.25.35-.85.5-1.3.25m-.1 2.8c-.25.35-.7.5-1.05.25c-2.7-1.65-6.8-2.15-9.95-1.15c-.4.1-.85-.1-.95-.5s.1-.85.5-.95c3.65-1.1 8.15-.55 11.25 1.35c.3.15.45.65.2 1m-1.2 2.75c-.2.3-.55.4-.85.2c-2.35-1.45-5.3-1.75-8.8-.95c-.35.1-.65-.15-.75-.45c-.1-.35.15-.65.45-.75c3.8-.85 7.1-.5 9.7 1.1c.35.15.4.55.25.85M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2" />
      ),
    },
    // Ikon lama yang tidak disediakan perubahannya akan tetap menggunakan default style 
    arrowDown: {
      viewBox: "0 0 24 24",
      content: <path stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />,
    },
    heart: {
      viewBox: "0 0 24 24",
      content: <path fill="none" stroke="#ec4899" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
    },
    target: {
      viewBox: "0 0 24 24",
      content: (
        <>
          <circle cx="12" cy="12" r="9" stroke="#ef4444" fill="none" strokeWidth={strokeWidth} />
          <circle cx="12" cy="12" r="5" stroke="#ef4444" fill="none" strokeWidth={strokeWidth} />
          <circle cx="12" cy="12" r="1.5" fill="#ef4444" stroke="none" />
        </>
      ),
    },
    language: {
      viewBox: "0 0 24 24",
      content: (
        <>
          <circle cx="12" cy="12" r="10" stroke="#0ea5e9" fill="none" strokeWidth={strokeWidth} />
          <path stroke="#0ea5e9" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </>
      ),
    },
    fire: {
      viewBox: "0 0 24 24",
      content: <path fill="none" stroke="#ff5722" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2c0 0-5 4.5-5 11a5 5 0 0 0 10 0c0-6.5-5-11-5-11z" />,
    },
  };

  const selectedIcon = icons[name] || {
    viewBox: "0 0 24 24",
    content: <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" strokeWidth={strokeWidth} />
  };

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox={selectedIcon.viewBox} 
      className={className} 
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    >
      {selectedIcon.content}
    </svg>
  );
};

interface BiodataSlideProps {
  activeUser: any;
  showBiodata: boolean;
  setShowBiodata: (show: boolean) => void;
}

export default function BiodataSlide({ activeUser, showBiodata, setShowBiodata }: BiodataSlideProps) {
  
  const hasDetails = activeUser && (
    activeUser.gender || activeUser.pendidikan || activeUser.tinggi_badan || 
    activeUser.zodiak || activeUser.agama || activeUser.tujuan || 
    activeUser.preferensi || activeUser.hobi || activeUser.olahraga || 
    activeUser.merokok || activeUser.alkohol || (activeUser.bahasa && activeUser.bahasa.length > 0) ||
    (activeUser.minat && activeUser.minat.length > 0)
  );

  const chipBaseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--text-main)',
    border: '1px solid var(--border-color, #e2e8f0)', // Outline persis gambar
    padding: '4px 10px', 
    borderRadius: '20px', 
    fontSize: '14px' 
  };

  return (
    <div 
      className={`hm-biodata-slide ${showBiodata ? 'open' : ''}`}
      style={{
        transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
        transform: showBiodata ? 'translateY(0)' : 'translateY(100%)',
        backgroundColor: 'var(--bg-modal)', 
        color: 'var(--text-main)', 
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)' 
      }}
    >
      <div 
        className="hm-biodata-header" 
        onClick={() => setShowBiodata(false)}
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', padding: '12px 0' }}
      >
        <div style={{ width: '40px', height: '5px', backgroundColor: 'var(--text-muted)', opacity: 0.5, borderRadius: '10px' }}></div>
      </div>
      
      {activeUser && (
        <div className="hm-biodata-content" style={{ padding: '0 20px 40px 20px' }}>
          
          <div style={{ marginBottom: '24px' }}>
            <h2 className="hm-biodata-title" style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0', color: 'var(--text-main)' }}>
              {activeUser.username}{activeUser.umur && `, ${activeUser.umur}`}
            </h2>
            <p className="hm-biodata-subtitle" style={{ margin: 0, fontSize: '15px', color: 'var(--text-muted)' }}>
              {activeUser.pekerjaan || "Belum mengisi pekerjaan"}
            </p>
          </div>
          
          {activeUser.bio_hype && (
            <div className="hm-biodata-section" style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px', fontWeight: 'bold' }}>
                Tentang Saya
              </h4>
              <p style={{ lineHeight: '1.6', fontSize: '15px', margin: 0, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                {activeUser.bio_hype}
              </p>
            </div>
          )}

          {hasDetails && (
            <div className="hm-biodata-section" style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.5px', fontWeight: 'bold' }}>
                Info & Gaya Hidup
              </h4>
              <div className="hm-chips-wrapper" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {activeUser.gender && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="gender" value={activeUser.gender} /> <span>{activeUser.gender}</span></div>}
                {activeUser.pendidikan && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="education" /> <span>{activeUser.pendidikan}</span></div>}
                {activeUser.tinggi_badan && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="height" /> <span>{activeUser.tinggi_badan} cm</span></div>}
                {activeUser.zodiak && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="zodiac" value={activeUser.zodiak} /> <span>{activeUser.zodiak}</span></div>}
                {activeUser.agama && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="religion" value={activeUser.agama} /> <span>{activeUser.agama}</span></div>}
                
                {activeUser.tujuan && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="target" /> <span>{activeUser.tujuan}</span></div>}
                {activeUser.preferensi && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="heart" /> <span>{activeUser.preferensi}</span></div>}
                {activeUser.hobi && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="hobby" /> <span>{activeUser.hobi}</span></div>}
                {activeUser.olahraga && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="sport" /> <span>{activeUser.olahraga}</span></div>}
                {activeUser.merokok && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="smoke" /> <span>{activeUser.merokok}</span></div>}
                {activeUser.alkohol && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="alcohol" /> <span>{activeUser.alkohol}</span></div>}
                
                {activeUser.bahasa && activeUser.bahasa.length > 0 && (
                  <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="language" /> <span>{activeUser.bahasa.join(', ')}</span></div>
                )}
                {activeUser.minat && activeUser.minat.length > 0 && (
                  <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="fire" /> <span>{activeUser.minat.join(', ')}</span></div>
                )}
              </div>
            </div>
          )}

          {(activeUser.ig_username || activeUser.tiktok_username || activeUser.spotify_url) && (
            <div className="hm-biodata-section" style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.5px', fontWeight: 'bold' }}>
                Sosial Media
              </h4>
              <div className="hm-chips-wrapper" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {activeUser.ig_username && <div className="hm-info-chip" style={{ ...chipBaseStyle, borderColor: 'rgba(225, 48, 108, 0.3)' }}><SvgIcon name="ig" /> <span>@{activeUser.ig_username}</span></div>}
                {activeUser.tiktok_username && <div className="hm-info-chip" style={{ ...chipBaseStyle, borderColor: 'rgba(254, 44, 85, 0.3)' }}><SvgIcon name="tiktok" /> <span>@{activeUser.tiktok_username}</span></div>}
                {activeUser.spotify_url && <div className="hm-info-chip" style={{ ...chipBaseStyle, borderColor: 'rgba(30, 215, 96, 0.3)' }}><SvgIcon name="spotify" /> <span>Spotify</span></div>}
              </div>
            </div>
          )}

          <div style={{ height: '60px' }}></div>
        </div>
      )}
    </div>
  );
}
