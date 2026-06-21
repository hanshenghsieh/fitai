'use client'

import { useState } from 'react'
import Image from 'next/image'
import { hasUserFoodPhoto } from '@/lib/food-image-display'
import type { FoodImageInput } from '@/lib/food-image-system'
import { TODAY } from '@/lib/today-design'

export type FoodPhotoThumbProps = FoodImageInput & {
  photo_url?: string
  size?: number
  radius?: number
}

/** Only renders when the user captured a real photo — no AI / category images. */
export default function FoodPhotoThumb({
  userUploadedPhoto,
  photo_url,
  size = 72,
  radius = 20,
}: FoodPhotoThumbProps) {
  const src = userUploadedPhoto ?? photo_url

  if (!hasUserFoodPhoto(src)) return null

  return (
    <UserPhoto
      src={src!}
      size={size}
      radius={radius}
    />
  )
}

function UserPhoto({ src, size, radius }: { src: string; size: number; radius: number }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null

  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
      }}
    >
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="object-cover w-full h-full"
        sizes={`${size}px`}
        onError={() => setFailed(true)}
      />
    </div>
  )
}
