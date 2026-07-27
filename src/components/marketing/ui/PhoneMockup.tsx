import Image from 'next/image'

const SOURCE_RATIO = '1206/2622'

export default function PhoneMockup({
  src,
  alt,
  className = '',
  priority = false,
}: {
  src: string
  alt: string
  className?: string
  priority?: boolean
}) {
  return (
    <div
      className={`shrink-0 rounded-[2.75rem] bg-gray-900 p-[7px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.35)] transition-transform duration-300 hover:-translate-y-1 ${className}`}
    >
      <div
        className="relative overflow-hidden rounded-[2.25rem] bg-white"
        style={{ aspectRatio: SOURCE_RATIO }}
      >
        <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-gray-900" />
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 40vw, (max-width: 1024px) 25vw, 300px"
          className="object-contain"
          priority={priority}
        />
      </div>
    </div>
  )
}
