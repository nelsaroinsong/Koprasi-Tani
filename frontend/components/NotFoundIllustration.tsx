import React from 'react';

export default function NotFoundIllustration({ className = 'w-full max-w-[480px] h-auto' }: { className?: string }) {
  return (
    <div className={`relative mx-auto select-none ${className}`}>
      <svg
        viewBox="0 0 700 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto overflow-visible"
        aria-label="404 Illustration"
      >
        <defs>
          {/* Subtle soft shadows */}
          <filter id="soft-glow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Mask for 4 texture waves */}
          <linearGradient id="charcoal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e2022" />
            <stop offset="100%" stopColor="#111215" />
          </linearGradient>

          <linearGradient id="bubble-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f8fafc" />
          </linearGradient>
        </defs>

        {/* --- Background Ground Shadows --- */}
        <ellipse cx="350" cy="425" rx="260" ry="16" fill="#f1f5f9" />
        <ellipse cx="350" cy="425" rx="180" ry="9" fill="#e2e8f0" opacity="0.6" />

        {/* --- Background Floating Leaves & Particles (Behind 404) --- */}
        <g className="animate-leaf-slow" opacity="0.6">
          {/* Top-left soft leaves */}
          <path d="M 230 110 C 235 95, 250 85, 260 90 C 270 95, 265 110, 255 115 C 245 120, 225 125, 230 110 Z" fill="#cbd5e1" />
          <path d="M 200 145 C 190 140, 185 125, 192 120 C 200 115, 210 125, 212 135 C 215 145, 210 150, 200 145 Z" fill="#94a3b8" />
          <path d="M 170 190 C 160 180, 150 190, 155 200 C 160 210, 175 205, 178 198 Z" fill="#e2e8f0" />
          {/* Top-right soft leaves */}
          <path d="M 470 120 C 475 105, 490 100, 498 108 C 505 115, 495 130, 485 132 C 475 135, 465 135, 470 120 Z" fill="#cbd5e1" />
          <path d="M 520 160 C 530 150, 545 155, 542 165 C 540 175, 528 180, 522 175 Z" fill="#94a3b8" />
          <path d="M 550 210 C 560 205, 570 212, 565 222 C 560 232, 548 228, 550 210 Z" fill="#e2e8f0" />
        </g>

        {/* --- 404 NUMBERS (Crisp, stylized dark block typography) --- */}
        {/* Left '4' */}
        <g id="number-4-left">
          {/* Main 4 shape */}
          <path
            d="M 285 365 L 235 365 L 235 305 L 125 305 L 125 250 L 225 140 L 285 140 L 285 260 L 315 260 L 315 305 L 285 305 L 285 365 Z M 235 260 L 235 205 L 175 260 L 235 260 Z"
            fill="url(#charcoal-grad)"
          />
          {/* Organic wave lines inside left 4 */}
          <path
            d="M 130 290 Q 180 270 230 290 Q 260 300 280 285"
            stroke="#2e3238"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 155 250 Q 195 240 230 255"
            stroke="#2e3238"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 235 335 Q 260 325 285 340"
            stroke="#2e3238"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* Center '0' */}
        <g id="number-0-center">
          <path
            d="M 350 135 C 410 135 445 185 445 255 C 445 325 410 375 350 375 C 290 375 255 325 255 255 C 255 185 290 135 350 135 Z M 350 185 C 325 185 310 215 310 255 C 310 295 325 325 350 325 C 375 325 390 295 390 255 C 390 215 375 185 350 185 Z"
            fill="url(#charcoal-grad)"
          />
          {/* Wavy details in 0 */}
          <path
            d="M 262 260 Q 285 245 310 260"
            stroke="#2e3238"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 390 260 Q 415 245 440 260"
            stroke="#2e3238"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 320 155 Q 350 145 380 155"
            stroke="#2e3238"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 320 355 Q 350 365 380 355"
            stroke="#2e3238"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* Right '4' */}
        <g id="number-4-right">
          <path
            d="M 575 365 L 525 365 L 525 305 L 415 305 L 415 250 L 515 140 L 575 140 L 575 260 L 605 260 L 605 305 L 575 305 L 575 365 Z M 525 260 L 525 205 L 465 260 L 525 260 Z"
            fill="url(#charcoal-grad)"
          />
          {/* Organic wave lines inside right 4 */}
          <path
            d="M 420 290 Q 470 270 520 290 Q 550 300 570 285"
            stroke="#2e3238"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 445 250 Q 485 240 520 255"
            stroke="#2e3238"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 525 335 Q 550 325 575 340"
            stroke="#2e3238"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* --- CHARACTER IN THE CENTER --- */}
        <g id="character-woman">
          {/* Hair behind neck */}
          <path
            d="M 315 200 C 300 230 305 270 320 290 C 330 300 340 305 350 305 C 365 305 385 295 390 280 C 400 255 400 220 385 195 Z"
            fill="#18181b"
          />

          {/* Torso / T-Shirt (Medium Heather Gray #64748b) */}
          <path
            d="M 330 260 L 375 260 L 398 320 L 405 385 L 305 385 L 312 320 Z"
            fill="#5f6775"
          />
          {/* Left sleeve (viewer's left) */}
          <path
            d="M 330 260 L 310 280 L 322 325 L 338 310 L 335 275 Z"
            fill="#525966"
          />
          {/* Left arm (viewer's left) */}
          <path
            d="M 310 280 L 295 325 L 308 340 L 322 325 Z"
            fill="#f5e6dd"
          />
          {/* Left hand / forearm */}
          <path
            d="M 295 325 C 290 338 300 355 315 350 C 322 346 324 335 322 325 Z"
            fill="#ebd5c8"
          />

          {/* Right sleeve (viewer's right, raised) */}
          <path
            d="M 375 260 L 405 265 L 420 305 L 395 315 L 382 280 Z"
            fill="#525966"
          />

          {/* Right arm going UP towards head */}
          <path
            d="M 405 265 L 425 240 L 415 195 L 395 190 L 405 225 L 390 260 Z"
            fill="#f5e6dd"
          />
          {/* Right hand touching temple / head */}
          <path
            d="M 395 190 C 392 180 380 178 375 186 C 372 192 376 200 384 202 L 400 202 Z"
            fill="#ebd5c8"
          />

          {/* Neck */}
          <path
            d="M 342 240 L 362 240 L 365 265 L 339 265 Z"
            fill="#ebd5c8"
          />
          {/* Collar line */}
          <path
            d="M 338 265 C 345 273 358 273 366 265"
            stroke="#454c59"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />

          {/* Head / Face */}
          <path
            d="M 335 192 C 335 170 348 155 365 155 C 382 155 392 170 392 192 C 392 215 380 240 365 240 C 348 240 335 215 335 192 Z"
            fill="#faece3"
          />

          {/* Face details (confused/worried expression) */}
          {/* Left eyebrow (slanted worried) */}
          <path d="M 343 182 Q 350 180 355 185" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Right eyebrow (raised confused) */}
          <path d="M 363 184 Q 370 178 376 182" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Left eye */}
          <ellipse cx="349" cy="191" rx="2.5" ry="3" fill="#1f2937" />
          {/* Right eye */}
          <ellipse cx="370" cy="191" rx="2.5" ry="3" fill="#1f2937" />
          {/* Nose */}
          <path d="M 359 193 L 357 203 L 362 204" stroke="#d4a390" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Mouth (squiggly confused / wavy) */}
          <path d="M 352 216 Q 358 214 362 217 Q 366 220 371 216" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* Hair Front & Bangs & Top (Dark charcoal / black) */}
          <path
            d="M 335 185 C 330 160 345 140 365 140 C 385 140 398 152 400 170 C 402 185 395 200 390 205 C 388 190 382 175 372 170 C 362 165 350 168 344 175 C 338 182 336 195 335 185 Z"
            fill="#18181b"
          />
          {/* Hair strand left flowing down */}
          <path
            d="M 336 185 C 332 205 328 230 334 250 C 335 240 338 210 340 195 Z"
            fill="#18181b"
          />
          {/* Hair curls right */}
          <path
            d="M 395 175 C 408 190 412 215 405 235 C 400 220 396 200 390 190 Z"
            fill="#18181b"
          />
        </g>

        {/* --- QUESTION MARK SPEECH BUBBLE --- */}
        <g id="question-bubble" className="animate-bubble-float">
          {/* Tail */}
          <path d="M 405 135 L 396 148 L 415 142 Z" fill="#ffffff" stroke="#18181b" strokeWidth="2" strokeLinejoin="round" />
          {/* Circle bubble */}
          <circle cx="425" cy="115" r="26" fill="url(#bubble-grad)" stroke="#18181b" strokeWidth="2.5" />
          {/* Question mark '?' */}
          <text
            x="425"
            y="126"
            textAnchor="middle"
            fill="#18181b"
            fontSize="32"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontWeight="bold"
          >
            ?
          </text>
        </g>

        {/* --- FLOATING LEAVES & PETALS (Foreground & Sides) --- */}
        <g className="animate-leaf-float">
          {/* Dark Charcoal Leaf Left */}
          <path
            d="M 180 340 C 185 320 205 310 215 320 C 225 330 215 350 200 355 C 185 360 175 355 180 340 Z"
            fill="#27272a"
          />
          {/* Gray Leaf Center Left */}
          <path
            d="M 275 390 C 280 375 295 370 302 378 C 308 385 300 400 290 402 C 280 405 272 400 275 390 Z"
            fill="#52525b"
          />
          {/* Small black leaf bottom left */}
          <path
            d="M 235 410 C 238 400 250 398 255 403 C 260 408 255 418 248 420 C 240 422 233 418 235 410 Z"
            fill="#18181b"
          />
          {/* Light Gray Leaf Bottom Right */}
          <path
            d="M 460 415 C 465 400 480 395 488 402 C 495 410 488 422 478 425 C 468 428 458 425 460 415 Z"
            fill="#71717a"
          />
          {/* Dark Leaf Right */}
          <path
            d="M 540 370 C 545 350 565 345 572 355 C 580 365 570 385 558 388 C 545 390 538 385 540 370 Z"
            fill="#27272a"
          />
          {/* Floating leaf middle right */}
          <path
            d="M 610 265 C 615 250 630 248 635 258 C 640 268 630 280 620 282 C 610 285 605 278 610 265 Z"
            fill="#18181b"
          />
          {/* Little leaf top right */}
          <path
            d="M 455 220 C 458 212 468 210 472 215 C 476 220 472 228 466 230 C 460 232 453 226 455 220 Z"
            fill="#3f3f46"
          />
          {/* Subtle dots / organic pollen */}
          <circle cx="215" cy="230" r="3.5" fill="#a1a1aa" />
          <circle cx="270" cy="180" r="3" fill="#d4d4d8" />
          <circle cx="490" cy="270" r="3.5" fill="#71717a" />
          <circle cx="580" cy="220" r="4" fill="#a1a1aa" />
          <circle cx="430" cy="170" r="2.5" fill="#52525b" />
          <circle cx="310" cy="140" r="3" fill="#a1a1aa" />
        </g>
      </svg>
    </div>
  );
}
