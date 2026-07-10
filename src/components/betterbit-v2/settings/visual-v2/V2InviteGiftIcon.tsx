/** Invite hero — flat gift box icon, Visual V2 green */
export default function V2InviteGiftIcon() {
  return (
    <div className="v2-sv2-invite-gift-icon" aria-hidden>
      <svg
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="v2-sv2-invite-gift-svg"
      >
        {/* box body */}
        <rect x="14" y="36" width="52" height="34" rx="6" fill="#2f8f35" />
        <rect x="14" y="36" width="52" height="34" rx="6" fill="url(#gift-body-shine)" />
        {/* lid */}
        <rect x="10" y="28" width="60" height="14" rx="5" fill="#1e6b24" />
        <rect x="10" y="28" width="60" height="14" rx="5" fill="url(#gift-lid-shine)" />
        {/* vertical ribbon */}
        <rect x="36" y="28" width="8" height="42" rx="2" fill="#3da842" />
        {/* bow left loop */}
        <ellipse cx="28" cy="22" rx="11" ry="9" fill="#2f8f35" />
        {/* bow right loop */}
        <ellipse cx="52" cy="22" rx="11" ry="9" fill="#2f8f35" />
        {/* bow center knot */}
        <circle cx="40" cy="24" r="5" fill="#1e6b24" />
        <circle cx="40" cy="24" r="3" fill="#3da842" />
        <defs>
          <linearGradient id="gift-body-shine" x1="14" y1="36" x2="66" y2="70" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2f8f35" stopOpacity="0" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="gift-lid-shine" x1="10" y1="28" x2="70" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" stopOpacity="0.15" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}
