"use client"

import { useState, useEffect } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { User } from "firebase/auth"

interface UserAvatarProps {
  user: User
  size?: number
  className?: string
}

interface UserProfile {
  photoURL?: string
  displayName?: string
}

export default function UserAvatar({ user, size = 32, className = "" }: UserAvatarProps) {
  const [photoURL, setPhotoURL] = useState<string | null>(user.photoURL)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user || !db) return
      
      setLoading(true)
      try {
        const userProfileDoc = await getDoc(doc(db, "users", user.uid))
        if (userProfileDoc.exists()) {
          const profileData = userProfileDoc.data() as UserProfile
          if (profileData.photoURL) {
            setPhotoURL(profileData.photoURL)
          }
        }
      } catch (error) {
        console.log("Could not fetch user profile photo")
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [user])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const displayName = user.displayName || user.email?.split("@")[0] || "User"

  if (loading) {
    return (
      <div 
        className={`rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={displayName}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div 
      className={`rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center font-medium text-purple-600 dark:text-purple-300 ${className}`}
      style={{ 
        width: size, 
        height: size, 
        fontSize: size < 32 ? '0.75rem' : '0.875rem' 
      }}
    >
      {getInitials(displayName)}
    </div>
  )
}