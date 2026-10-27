// PURPOSE: Decorative illustration for the sign-in / sign-up hero: book stack (Learn, Practice, Succeed), laptop,
//          graduation cap, checklist, A+ paper, stars, light bulb, paper plane and a plant.
// WHY: Pure inline SVG: no image download, sharp at any size, easy to replace with a real artwork later.
// DEPENDS ON: Nothing. aria-hidden: it carries no information the text does not already give.

export function AuthIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 420"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ai-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="ai-blue" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3b5bdb" />
          <stop offset="1" stopColor="#4c6ef5" />
        </linearGradient>
        <linearGradient id="ai-purple" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7048e8" />
          <stop offset="1" stopColor="#845ef7" />
        </linearGradient>
        <linearGradient id="ai-orange" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f76707" />
          <stop offset="1" stopColor="#ff922b" />
        </linearGradient>
      </defs>

      {/* soft clouds and orbit */}
      <ellipse cx="240" cy="250" rx="210" ry="120" fill="url(#ai-cloud)" />
      <ellipse cx="120" cy="300" rx="90" ry="45" fill="#fff" opacity="0.18" />
      <ellipse cx="370" cy="290" rx="100" ry="50" fill="#fff" opacity="0.18" />
      <path
        d="M110 150 C 150 40, 340 30, 390 140"
        stroke="#fff"
        strokeOpacity="0.6"
        strokeWidth="2"
        strokeDasharray="6 8"
      />

      {/* checklist notepad */}
      <g transform="rotate(-10 105 95)">
        <rect x="60" y="50" width="96" height="112" rx="10" fill="#fff" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle key={i} cx={72 + i * 15} cy="50" r="4" fill="#495057" />
        ))}
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="72" y={74 + i * 26} width="16" height="16" rx="4" fill="#20c997" />
            <path
              d={`M76 ${82 + i * 26} l3 3 6-6`}
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="96" y={78 + i * 26} width="48" height="7" rx="3.5" fill="#bac8ff" />
          </g>
        ))}
      </g>

      {/* graduation cap */}
      <g transform="translate(240 70)">
        <path d="M-62 0 L0 -28 L62 0 L0 28 Z" fill="#212150" />
        <path d="M-36 12 v22 c0 10 72 10 72 0 v-22 L0 28 Z" fill="#2b2b6b" />
        <path d="M44 6 v34" stroke="#fab005" strokeWidth="3" />
        <circle cx="44" cy="44" r="6" fill="#fab005" />
      </g>

      {/* A+ paper */}
      <g transform="rotate(12 380 110)">
        <rect x="335" y="60" width="96" height="120" rx="10" fill="#fff" />
        <text
          x="390"
          y="100"
          fontSize="30"
          fontWeight="800"
          fill="#3b5bdb"
          fontFamily="Inter, sans-serif"
        >
          A+
        </text>
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x="350"
            y={118 + i * 13}
            width={i === 3 ? 40 : 64}
            height="6"
            rx="3"
            fill="#dbe4ff"
          />
        ))}
      </g>

      {/* stars, light bulb, paper plane */}
      <path d="M180 120 l6 12 13 2 -10 9 3 13 -12-7 -12 7 3-13 -10-9 13-2z" fill="#fcc419" />
      <path d="M318 168 l4 8 9 1 -7 6 2 9 -8-5 -8 5 2-9 -7-6 9-1z" fill="#ffe066" />
      <path d="M430 40 l3 6 6 1 -5 4 1 6 -5-3 -5 3 1-6 -5-4 6-1z" fill="#fff" />
      <g transform="translate(345 210)">
        <circle cx="0" cy="0" r="16" fill="#ffd43b" />
        <rect x="-7" y="14" width="14" height="10" rx="3" fill="#868e96" />
        {[-1, 0, 1].map((i) => (
          <path
            key={i}
            d={`M${i * 16} -22 l${i * 4} -8`}
            stroke="#ffd43b"
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}
      </g>
      <path d="M400 230 l52 -22 -18 46 -10 -16 -24 -8z" fill="#ffa94d" />
      <path d="M424 238 l28 -30" stroke="#e8590c" strokeWidth="2" />

      {/* plant */}
      <g transform="translate(410 330)">
        <path d="M0 0 C -30 -40, -10 -80, 0 -90 C 10 -80, 30 -40, 0 0Z" fill="#2f9e44" />
        <path d="M0 0 C -45 -20, -55 -50, -40 -60 C -25 -50, -15 -20, 0 0Z" fill="#40c057" />
        <path d="M0 0 C 45 -20, 55 -50, 40 -60 C 25 -50, 15 -20, 0 0Z" fill="#37b24d" />
        <path d="M-24 0 h48 l-6 38 h-36z" fill="#f8f9fa" />
      </g>

      {/* book stack */}
      <g fontFamily="Inter, sans-serif" fontWeight="700" fontSize="18" fill="#fff">
        <rect x="95" y="352" width="240" height="40" rx="8" fill="url(#ai-orange)" />
        <rect x="300" y="358" width="30" height="28" rx="3" fill="#fff4e6" />
        <text x="115" y="378">
          Succeed
        </text>
        <rect x="110" y="312" width="230" height="40" rx="8" fill="url(#ai-purple)" />
        <rect x="305" y="318" width="30" height="28" rx="3" fill="#f3f0ff" />
        <text x="130" y="338">
          Practice
        </text>
        <rect x="125" y="272" width="220" height="40" rx="8" fill="url(#ai-blue)" />
        <rect x="310" y="278" width="30" height="28" rx="3" fill="#edf2ff" />
        <text x="145" y="298">
          Learn
        </text>
      </g>

      {/* laptop on the books */}
      <g transform="translate(235 268)">
        <path d="M-70 0 h140 l-12 -84 h-116z" fill="#dee2e6" />
        <path d="M-60 -8 h120 l-10 -68 h-100z" fill="#e9ecef" />
        <path d="M-26 -44 L0 -56 L26 -44 L0 -32 Z" fill="#212150" />
        <path d="M-15 -38 v8 c0 5 30 5 30 0 v-8" fill="#2b2b6b" />
        <rect x="-80" y="0" width="160" height="7" rx="3.5" fill="#adb5bd" />
      </g>

      {/* open book and pen */}
      <g transform="translate(330 395)">
        <path
          d="M-70 -16 C -40 -26, -10 -22, 0 -12 C 10 -22, 40 -26, 70 -16 L 70 10 C 40 0, 10 4, 0 14 C -10 4, -40 0, -70 10 Z"
          fill="#fff"
        />
        <path d="M0 -12 v26" stroke="#ced4da" strokeWidth="2" />
        <path d="M30 -60 l-26 50 4 3 30 -47z" fill="#364fc7" />
        <path d="M4 -10 l-2 8 6 -4z" fill="#fab005" />
      </g>
    </svg>
  );
}
