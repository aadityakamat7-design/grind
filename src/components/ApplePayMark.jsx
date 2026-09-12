// Official Apple Pay mark — Apple logo + "Pay" wordmark in white.
// Rendered on a black button, this is the Apple Pay button per Apple's guidelines.
export default function ApplePayMark({ className = "h-6" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 32"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Apple logo */}
      <path
        d="M18.35 22.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C5.79 17.25 6.51 9.59 12.05 9.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM15.03 9.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
        fill="white"
        transform="scale(0.75) translate(0, 3)"
      />
      {/* "Pay" text */}
      <text
        x="28"
        y="22"
        fill="white"
        fontFamily="-apple-system, 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif"
        fontSize="17"
        fontWeight="500"
        letterSpacing="-0.5"
      >
        Pay
      </text>
    </svg>
  );
}