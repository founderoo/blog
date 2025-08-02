
import React, { useState } from "react"
import { Upload, Loader2 } from "lucide-react"
import { uploadImageToCloudinary } from "@/utils/uploadToCloudinary"
import CloudinaryImage from "./CloudinaryImage"

interface ImageUploadProps {
  currentImageUrl?: string | null
  onUploadSuccess: (url: string) => void
  className?: string
}

export default function ImageUpload({ currentImageUrl, onUploadSuccess, className = "" }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset error state
    setError("")

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB")
      return
    }

    setIsUploading(true)
    try {
      const result = await uploadImageToCloudinary(file)
      onUploadSuccess(result.url)
    } catch (error) {
      console.error("Upload error:", error)
      setError("Failed to upload image. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className={`relative group ${className}`}>
      {currentImageUrl ? (
        <div className="relative w-32 h-32 rounded-full overflow-hidden group">
          <CloudinaryImage
            src={currentImageUrl}
            alt="Profile photo"
            width={128}
            height={128}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <label className="cursor-pointer p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all">
              <Upload className="w-6 h-6 text-white" />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
          </div>
        </div>
      ) : (
        <label className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 dark:hover:border-purple-400 transition-colors">
          <Upload className="w-6 h-6 text-gray-400 dark:text-gray-500 mb-2" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Upload photo</span>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      )}

      {isUploading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute -bottom-6 left-0 right-0 text-center">
          <span className="text-xs text-red-500">{error}</span>
        </div>
      )}
    </div>
  )
}