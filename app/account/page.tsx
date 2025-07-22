"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { collection, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Edit, Trash2, Clock, ArrowUp, MessageCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

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
  updatedAt: any
  likes: number
  comments: number
  isEditable: boolean
}

export default function AccountPage() {
  const { user, userProfile, updateUserProfile } = useAuth()
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProfile, setEditingProfile] = useState(false)
  const [aboutMe, setAboutMe] = useState("")
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const router = useRouter()

  useEffect(() => {
    if (user) {
      fetchUserPosts()
      setAboutMe(userProfile?.aboutMe || "")
    }
  }, [user, userProfile])

  const fetchUserPosts = async () => {
    if (!user) return

    try {
      const postsQuery = query(collection(db, "posts"), where("authorId", "==", user.uid), orderBy("createdAt", "desc"))
      const snapshot = await getDocs(postsQuery)
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[]

      // Check if posts are still editable (30 minutes after creation)
      const now = new Date()
      const updatedPosts = postsData.map((post) => {
        const createdAt = post.createdAt?.toDate() || new Date(post.createdAt)
        const timeDiff = now.getTime() - createdAt.getTime()
        const thirtyMinutes = 30 * 60 * 1000

        return {
          ...post,
          isEditable: timeDiff < thirtyMinutes,
        }
      })

      setUserPosts(updatedPosts)
    } catch (error) {
      console.error("Error fetching user posts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async () => {
    try {
      await updateUserProfile({ aboutMe })
      setEditingProfile(false)
    } catch (error) {
      console.error("Error updating profile:", error)
    }
  }

  const handleEditPost = (post: Post) => {
    setEditingPost(post.id)
    setEditTitle(post.title)
    setEditContent(post.content)
  }

  const handleUpdatePost = async (postId: string) => {
    try {
      const postRef = doc(db, "posts", postId)
      await updateDoc(postRef, {
        title: editTitle,
        content: editContent,
        updatedAt: new Date(),
      })

      setUserPosts((prev) =>
        prev.map((post) => (post.id === postId ? { ...post, title: editTitle, content: editContent } : post)),
      )

      setEditingPost(null)
      setEditTitle("")
      setEditContent("")
    } catch (error) {
      console.error("Error updating post:", error)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return

    try {
      await deleteDoc(doc(db, "posts", postId))
      setUserPosts((prev) => prev.filter((post) => post.id !== postId))
    } catch (error) {
      console.error("Error deleting post:", error)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return ""
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getTimeRemaining = (createdAt: any) => {
    if (!createdAt) return "Expired"
    const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt)
    const now = new Date()
    const timeDiff = now.getTime() - created.getTime()
    const thirtyMinutes = 30 * 60 * 1000
    const remaining = thirtyMinutes - timeDiff

    if (remaining <= 0) return "Expired"

    const minutes = Math.floor(remaining / (60 * 1000))
    return `${minutes} min remaining`
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to view your account</h1>
          <Link href="/login" className="text-purple-600 hover:text-purple-700">
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Section */}
        <div className="bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-6 mb-8">
          <h1 className="text-3xl font-bold mb-6">My Account</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Display Name</label>
                  <p className="text-gray-600 dark:text-gray-400">{userProfile?.displayName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <p className="text-gray-600 dark:text-gray-400">{userProfile?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Member Since</label>
                  <p className="text-gray-600 dark:text-gray-400">{formatDate(userProfile?.createdAt)}</p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">About Me</h2>
                <button
                  onClick={() => setEditingProfile(!editingProfile)}
                  className="text-purple-600 hover:text-purple-700 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>

              {editingProfile ? (
                <div className="space-y-4">
                  <textarea
                    value={aboutMe}
                    onChange={(e) => setAboutMe(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800"
                    placeholder="Tell us about yourself..."
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleProfileUpdate}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingProfile(false)
                        setAboutMe(userProfile?.aboutMe || "")
                      }}
                      className="border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">{userProfile?.aboutMe || "No bio added yet."}</p>
              )}
            </div>
          </div>
        </div>

        {/* My Posts Section */}
        <div className="bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">My Posts ({userPosts.length})</h2>
            <Link
              href="/create"
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Create New Post
            </Link>
          </div>

          {userPosts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">You haven't created any posts yet.</p>
              <Link href="/create" className="text-purple-600 hover:text-purple-700 transition-colors">
                Create your first post
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {userPosts.map((post) => (
                <div
                  key={post.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {editingPost === post.id ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800"
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleUpdatePost(post.id)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => {
                            setEditingPost(null)
                            setEditTitle("")
                            setEditContent("")
                          }}
                          className="border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <Link href={`/post/${post.id}`}>
                            <h3 className="font-semibold text-lg hover:text-purple-600 transition-colors cursor-pointer">
                              {post.title}
                            </h3>
                          </Link>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <span>{formatDate(post.createdAt)}</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                              {post.category}
                            </span>
                            {post.isEditable && (
                              <div className="flex items-center space-x-1 text-green-600">
                                <Clock className="h-3 w-3" />
                                <span className="text-xs">{getTimeRemaining(post.createdAt)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {post.isEditable && (
                            <button
                              onClick={() => handleEditPost(post)}
                              className="text-purple-600 hover:text-purple-700 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="text-red-600 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-3">{post.content}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <ArrowUp className="h-4 w-4" />
                            <span>{post.likes} likes</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="h-4 w-4" />
                            <span>{post.comments} comments</span>
                          </div>
                        </div>

                        <Link
                          href={`/post/${post.id}`}
                          className="text-purple-600 hover:text-purple-700 transition-colors text-sm"
                        >
                          View Post
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
