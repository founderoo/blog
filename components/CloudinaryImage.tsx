"use client"

import { useState } from "react"
import Image from "next/image"

interface CloudinaryImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  onClick?: () => void
  quality?: number
  crop?: string
}

export default function CloudinaryImage({
  src,
  alt,
  width = 400,
  height = 300,
  className = "",
  onClick,
  quality = 80,
  crop = "fill"
}: CloudinaryImageProps) {
  const [imageError, setImageError] = useState(false)
  const [loading, setLoading] = useState(true)

  // Enhanced Cloudinary URL transformation
  const getOptimizedCloudinaryUrl = (originalUrl: string) => {
    if (!originalUrl.includes('cloudinary.com')) {
      return originalUrl
    }

    try {
      // Extract the public ID from the Cloudinary URL
      const urlParts = originalUrl.split('/')
      const uploadIndex = urlParts.findIndex(part => part === 'upload')
      
      if (uploadIndex === -1) return originalUrl

      const baseUrl = urlParts.slice(0, uploadIndex + 1).join('/')
      const publicIdParts = urlParts.slice(uploadIndex + 1)
      const publicId = publicIdParts.join('/')

      // Build optimized URL with transformations
      const transformations = [
        `w_${width}`,
        `h_${height}`,
        `c_${crop}`,
        `q_${quality}`,
        'f_auto', // Auto format (WebP, AVIF when supported)
        'dpr_auto' // Auto DPR for retina displays
      ].join(',')

      return `${baseUrl}/${transformations}/${publicId}`
    } catch (error) {
      console.error('Error optimizing Cloudinary URL:', error)
      return originalUrl
    }
  }

  const optimizedSrc = getOptimizedCloudinaryUrl(src)

  if (imageError) {
    return (
      <div 
        className={`bg-gray-200 dark:bg-gray-700 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          <p className="text-xs">Image failed to load</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <Image
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onClick={onClick}
        onLoad={() => setLoading(false)}
        onError={() => {
          setImageError(true)
          setLoading(false)
        }}
        quality={quality}
        priority={false}
      />
      
      {loading && (
        <div 
          className={`absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded ${className}`}
          style={{ width, height }}
        >
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      )}
    </div>
  )
}
