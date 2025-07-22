"use client"

import { useState, useEffect } from "react"
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { ArrowUp, MessageCircle, Share, Flag, Trophy, Edit, Megaphone } from "lucide-react"
import Link from "next/link"
import ImageModal from "@/components/ImageModal"

interface Post {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  images: string[]
  authorId: string
  authorName: string
  createdAt: any
  likes: number
  comments: number
  shares: number
  reports: number
  likedBy: string[]
}

// Mock data for demo mode
const mockPosts: Post[] = [
  {
    id: "1",
    title: 'Hitting $2M ARR in two years even though he was "late to the AI party"',
    content:
      "Dominic Zijlstra built an AI SEO tool to $2M ARR in two years. Here's how he did it and what lessons other founders can learn from his journey. When Dominic started working on his AI SEO tool, he felt like he was already late to the party. Everyone was talking about AI, and it seemed like every startup was pivoting to include AI in their product. But instead of being discouraged, he decided to focus on a specific niche where he could add real value.",
    category: "Business",
    tags: ["AI", "SaaS", "Revenue"],
    images: ["/placeholder.svg?height=400&width=800"],
    authorId: "demo1",
    authorName: "Indie James",
    createdAt: new Date("2024-01-15"),
    likes: 21,
    comments: 15,
    shares: 8,
    reports: 0,
    likedBy: [],
  },
  {
    id: "2",
    title: "How to get AI to build a website you'd actually launch",
    content:
      "Building websites with AI tools has become incredibly powerful, but there's a right way and a wrong way to do it. In this post, I'll share the strategies that actually work for creating production-ready websites with AI assistance.",
    category: "Technology",
    tags: ["AI", "Web Development", "Tutorial"],
    images: [],
    authorId: "demo2",
    authorName: "Yusuf Tekin",
    createdAt: new Date("2024-01-14"),
    likes: 23,
    comments: 15,
    shares: 12,
    reports: 0,
    likedBy: [],
  },
  {
    id: "3",
    title: "Made $12,000 with my SaaS in 7 months. Here's what worked and what didn't.",
    content:
      "After 7 months of building and marketing my SaaS, I've learned some valuable lessons about what actually moves the needle. Here's my honest breakdown of what worked, what failed, and what I'd do differently.",
    category: "Startup",
    tags: ["SaaS", "Revenue", "Lessons"],
    images: [],
    authorId: "demo3",
    authorName: "Build With Me",
    createdAt: new Date("2024-01-13"),
    likes: 44,
    comments: 49,
    shares: 22,
    reports: 0,
    likedBy: [],
  },
]

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [featuredPost, setFeaturedPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null)
  const [hoveredPost, setHoveredPost] = useState<string | null>(null)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)
  const { user, isFirebaseConfigured } = useAuth()

  useEffect(() => {
    if (isFirebaseConfigured) {
      fetchPosts()
    } else {
      // Use mock data in demo mode
      setPosts(mockPosts)
      setFeaturedPost(mockPosts[0])
      setLoading(false)
    }
  }, [isFirebaseConfigured])

  const fetchPosts = async () => {
    if (!db) {
      setLoading(false)
      return
    }

    try {
      const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(20))
      const snapshot = await getDocs(postsQuery)
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[]

      setPosts(postsData)
      if (postsData.length > 0) {
        setFeaturedPost(postsData[0])
      }
    } catch (error) {
      console.error("Error fetching posts:", error)
      // Fallback to mock data on error
      setPosts(mockPosts)
      setFeaturedPost(mockPosts[0])
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (postId: string) => {
    if (!user || !isFirebaseConfigured) {
      alert("Please log in to like posts")
      return
    }

    const post = posts.find((p) => p.id === postId)
    if (!post || !db) return

    const isLiked = post.likedBy.includes(user.uid)
    const postRef = doc(db, "posts", postId)

    try {
      if (isLiked) {
        await updateDoc(postRef, {
          likes: increment(-1),
          likedBy: arrayRemove(user.uid),
        })
      } else {
        await updateDoc(postRef, {
          likes: increment(1),
          likedBy: arrayUnion(user.uid),
        })
      }

      // Update local state
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                likes: isLiked ? p.likes - 1 : p.likes + 1,
                likedBy: isLiked ? p.likedBy.filter((id) => id !== user.uid) : [...p.likedBy, user.uid],
              }
            : p,
        ),
      )

      if (featuredPost?.id === postId) {
        setFeaturedPost((prev) =>
          prev
            ? {
                ...prev,
                likes: isLiked ? prev.likes - 1 : prev.likes + 1,
                likedBy: isLiked ? prev.likedBy.filter((id) => id !== user.uid) : [...prev.likedBy, user.uid],
              }
            : null,
        )
      }
    } catch (error) {
      console.error("Error updating like:", error)
    }
  }

  const handleShare = async (postId: string) => {
    if (!isFirebaseConfigured) {
      // In demo mode, just copy the link
      navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`)
      alert("Link copied to clipboard! (Demo mode)")
      return
    }

    if (!db) return

    const postRef = doc(db, "posts", postId)
    try {
      await updateDoc(postRef, {
        shares: increment(1),
      })

      // Update local state
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, shares: p.shares + 1 } : p)))

      if (featuredPost?.id === postId) {
        setFeaturedPost((prev) => (prev ? { ...prev, shares: prev.shares + 1 } : null))
      }

      // Copy link to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`)
      alert("Link copied to clipboard!")
    } catch (error) {
      console.error("Error sharing post:", error)
    }
  }

  const handleReport = async (postId: string) => {
    if (!user || !isFirebaseConfigured) {
      alert("Please log in to report posts")
      return
    }

    if (!db) return

    const postRef = doc(db, "posts", postId)
    try {
      await updateDoc(postRef, {
        reports: increment(1),
      })

      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, reports: p.reports + 1 } : p)))

      alert("Post reported. Thank you for helping keep our community safe.")
    } catch (error) {
      console.error("Error reporting post:", error)
    }
  }

  const handleMouseEnter = (postId: string) => {
    const timeout = setTimeout(() => {
      setHoveredPost(postId)
    }, 1000) // Show summary after 1 second of hovering
    setHoverTimeout(timeout)
  }

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      setHoverTimeout(null)
    }
    setHoveredPost(null)
  }

  const getSummary = (content: string) => {
    // Placeholder for AI summarization - you can integrate with AI service later
    const sentences = content.split(".").filter((s) => s.trim().length > 0)
    return sentences.slice(0, 2).join(".") + (sentences.length > 2 ? "..." : "")
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
        {/* Left Sidebar - Latest Posts */}
        <div className="lg:col-span-3 lg:order-1 order-2">
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-lg md:text-xl font-bold">Latest Posts</h2>
            <div className="space-y-3 md:space-y-4">
              {posts.slice(1).map((post) => (
                <div
                  key={post.id}
                  className="relative rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onMouseEnter={() => handleMouseEnter(post.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  <Link href={`/post/${post.id}`}>
                    <div className="p-3 md:p-4">
                      <h3 className="font-medium text-sm leading-tight mb-2 md:mb-3">{post.title}</h3>
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-3 md:space-x-4">
                          <div className="flex items-center space-x-1">
                            <ArrowUp className="h-3 w-3" />
                            <span>{post.likes}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="h-3 w-3" />
                            <span>{post.comments}</span>
                          </div>
                        </div>
                        <span className="text-xs">@{post.authorName}</span>
                      </div>
                    </div>
                  </Link>

                  {/* AI Summary Tooltip */}
                  {hoveredPost === post.id && (
                    <div className="absolute z-10 top-full left-0 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                      <div className="text-xs font-semibold text-purple-600 mb-1">TL;DR</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{getSummary(post.content)}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Featured Post */}
        <div className="lg:col-span-6 lg:order-2 order-1">
          {featuredPost && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm overflow-hidden">
              {featuredPost.images.length > 0 && (
                <div className="relative h-48 md:h-64 lg:h-80">
                  <img
                    src={featuredPost.images[0] || "/placeholder.svg"}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setSelectedImage({ src: featuredPost.images[0], alt: featuredPost.title })}
                  />
                </div>
              )}
              <div className="p-4 md:p-6">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                    {featuredPost.category}
                  </span>
                </div>
                <Link href={`/post/${featuredPost.id}`}>
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-3 md:mb-4 hover:text-purple-600 transition-colors">
                    {featuredPost.title}
                  </h1>
                </Link>
                <p className="text-gray-600 dark:text-gray-400 mb-4 md:mb-6 text-sm md:text-base">
                  {getSummary(featuredPost.content)}
                </p>

                {/* AI Summary Section */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mb-4">
                  <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
                    AI Summary (TL;DR)
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{getSummary(featuredPost.content)}</div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center space-x-4 md:space-x-6">
                    <button
                      onClick={() => handleLike(featuredPost.id)}
                      className={`flex items-center space-x-2 hover:text-purple-600 transition-colors ${
                        user && featuredPost.likedBy.includes(user.uid) ? "text-purple-600" : ""
                      }`}
                    >
                      <ArrowUp className="h-4 w-4" />
                      <span className="font-medium text-sm md:text-base">{featuredPost.likes} upvotes</span>
                    </button>
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-sm md:text-base">{featuredPost.comments} comments</span>
                    </div>
                    <button
                      onClick={() => handleShare(featuredPost.id)}
                      className="flex items-center space-x-2 hover:text-purple-600 transition-colors"
                    >
                      <Share className="h-4 w-4" />
                      <span className="text-sm md:text-base">Share</span>
                    </button>
                    <button
                      onClick={() => handleReport(featuredPost.id)}
                      className="flex items-center space-x-2 hover:text-red-600 transition-colors"
                    >
                      <Flag className="h-4 w-4" />
                      <span className="text-sm md:text-base">Report</span>
                    </button>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                    @{featuredPost.authorName}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-3 order-3 space-y-4 md:space-y-6">
          {/* Newsletter */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm">
            <div className="p-4 md:p-6">
              <h3 className="font-bold mb-2">Newsletter</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">The power of the founder is exploding.</p>
              <button className="w-full bg-pink-500 hover:bg-pink-600 text-white py-2 px-4 rounded-md transition-colors font-medium">
                SUBSCRIBE to keep up.
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm">
            <div className="p-4 md:p-6">
              <h3 className="font-bold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href="/create"
                  className="flex items-center space-x-3 text-sm cursor-pointer hover:text-purple-600 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Submit a Post to Blog</span>
                </Link>
                <div className="flex items-center space-x-3 text-sm cursor-pointer hover:text-purple-600 transition-colors">
                  <Megaphone className="h-4 w-4" />
                  <span>Advertise on Blog</span>
                </div>
              </div>
            </div>
          </div>

          {/* The Build Board */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm">
            <div className="p-4 md:p-6">
              <div className="flex items-center space-x-2 mb-2">
                <Trophy className="h-5 w-5 text-purple-600" />
                <h3 className="font-bold">The Build Board</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                A daily leaderboard of build-in-public posts.
              </p>
              <div className="space-y-4">
                {posts.slice(0, 3).map((post, index) => (
                  <div key={post.id} className="flex items-start space-x-3">
                    <span className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 px-2.5 py-0.5 text-xs font-semibold">
                      #{index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="flex h-6 w-6 shrink-0 overflow-hidden rounded-full bg-purple-100 dark:bg-purple-900/50">
                          <span className="flex h-full w-full items-center justify-center text-xs font-medium text-purple-600 dark:text-purple-300">
                            {post.authorName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-sm">{post.authorName}</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight mb-2">{post.title}</p>
                      <div className="flex items-center space-x-1">
                        <ArrowUp className="h-3 w-3" />
                        <span className="text-xs">{post.likes}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        src={selectedImage?.src || ""}
        alt={selectedImage?.alt || ""}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  )
}
