"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { X, Upload } from "lucide-react"
import { uploadImageToCloudinary } from "@/utils/uploadToCloudinary"

const categories = [
  "Technology",
  "Business", 
  "Startup",
  "AI/ML",
  "Design",
  "Marketing",
  "Finance",
  "Productivity",
  "Other",
]

export default function CreatePostForm() {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("")
  const [tags, setTags] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [error, setError] = useState("")
  const { user, isFirebaseConfigured } = useAuth()
  const router = useRouter()

  const debugLog = (message: string, data?: any) => {
    console.log(`[CreatePost Debug] ${message}`, data || '')
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files)
      debugLog('Images selected:', newImages.length)
      setImages((prev) => [...prev, ...newImages])
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    debugLog('Form submitted')
    
    if (!user) {
      debugLog('No user found')
      setError("You must be logged in to create a post")
      return
    }

    if (!isFirebaseConfigured) {
      debugLog('Firebase not configured')
      setError("Firebase is not properly configured")
      return
    }

    if (!db) {
      debugLog('Database not available')
      setError("Database connection not available")
      return
    }

    if (!title.trim() || !content.trim() || !category) {
      debugLog('Missing required fields')
      setError("Please fill in all required fields")
      return
    }

    setLoading(true)
    setError("")

    try {
      debugLog('Starting post creation process')
      debugLog('User info:', { uid: user.uid, displayName: user.displayName })

      // Upload images to Cloudinary if any
      const imageUrls = []
      if (images.length > 0) {
        debugLog('Uploading images to Cloudinary:', images.length)
        setUploadingImages(true)
        
        for (const image of images) {
          try {
            debugLog('Uploading image:', image.name)
            const result = await uploadImageToCloudinary(image)
            imageUrls.push(result.url)
            debugLog('Image uploaded successfully:', result.url)
          } catch (imageError) {
            debugLog('Image upload failed:', imageError)
            throw new Error(`Failed to upload image ${image.name}: ${imageError}`)
          }
        }
        setUploadingImages(false)
      }

      // Prepare post data
      const postData = {
        title: title.trim(),
        content: content.trim(),
        category,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        images: imageUrls, // Cloudinary URLs instead of Firebase URLs
        authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || "Anonymous",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        likes: 0,
        comments: 0,
        shares: 0,
        reports: 0,
        likedBy: [],
        isEditable: true,
      }

      debugLog('Post data prepared:', postData)

      // Create post in Firestore
      debugLog('Adding document to Firestore...')
      const docRef = await addDoc(collection(db, "posts"), postData)
      debugLog('Document created with ID:', docRef.id)

      // Clear form
      setTitle("")
      setContent("")
      setCategory("")
      setTags("")
      setImages([])

      alert("Post created successfully!")
      router.push("/")
      
    } catch (error: any) {
      debugLog('Error occurred:', error)
      console.error("Full error details:", error)
      setError(`Failed to create post: ${error.message}`)
    } finally {
      setLoading(false)
      setUploadingImages(false)
    }
  }

  // Check authentication status
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to create a post</h1>
          <p className="text-gray-600">You need to be authenticated to create posts.</p>
        </div>
      </div>
    )
  }

  // Check Firebase configuration
  if (!isFirebaseConfigured) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Firebase Configuration Error</h1>
          <p className="text-gray-600">Firebase is not properly configured. Please check your configuration.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Create New Post</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800"
              placeholder="Enter your post title"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium mb-2">
              Category *
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800"
              placeholder="e.g., startup, technology, growth"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium mb-2">
              Content *
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800"
              placeholder="Write your post content here..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Images (Optional)</label>
            <div className="space-y-4">
              <label className="flex items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> images
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="hidden"
                  disabled={loading || uploadingImages}
                />
              </label>

              {uploadingImages && (
                <div className="text-center py-4">
                  <p className="text-blue-600">Uploading images ...</p>
                </div>
              )}

              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        disabled={loading || uploadingImages}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || uploadingImages}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading 
                ? (uploadingImages ? "Uploading Images..." : "Publishing...") 
                : "Publish Post"
              }
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              disabled={loading || uploadingImages}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
