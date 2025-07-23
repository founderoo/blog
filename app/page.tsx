"use client";

import { useState, useEffect } from "react";
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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowUp,
  MessageCircle,
  Share,
  Flag,
  Trophy,
  Edit,
  Megaphone,
} from "lucide-react";
import Link from "next/link";
import ImageModal from "@/components/ImageModal";

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  images: string[];
  authorId: string;
  authorName: string;
  createdAt: any;
  likes: number;
  comments: number;
  shares: number;
  reports: number;
  likedBy: string[];
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [featuredPost, setFeaturedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const { user, isFirebaseConfigured } = useAuth();

  useEffect(() => {
    fetchPosts();
  }, [isFirebaseConfigured]);

  const fetchPosts = async () => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      setError("Firebase is not configured");
      return;
    }

    if (!db) {
      setLoading(false);
      setError("Database connection failed");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const postsQuery = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc"),
        limit(20)
      );

      const snapshot = await getDocs(postsQuery);
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];

      setPosts(postsData);
      if (postsData.length > 0) {
        setFeaturedPost(postsData[0]);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      setError("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (!user || !isFirebaseConfigured) {
      alert("Please log in to like posts");
      return;
    }

    const post = posts.find((p) => p.id === postId);
    if (!post || !db) return;

    const isLiked = post.likedBy?.includes(user.uid) || false;
    const postRef = doc(db, "posts", postId);

    try {
      if (isLiked) {
        await updateDoc(postRef, {
          likes: increment(-1),
          likedBy: arrayRemove(user.uid),
        });
      } else {
        await updateDoc(postRef, {
          likes: increment(1),
          likedBy: arrayUnion(user.uid),
        });
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                likes: isLiked ? (p.likes || 0) - 1 : (p.likes || 0) + 1,
                likedBy: isLiked
                  ? (p.likedBy || []).filter((id) => id !== user.uid)
                  : [...(p.likedBy || []), user.uid],
              }
            : p
        )
      );

      if (featuredPost?.id === postId) {
        setFeaturedPost((prev) =>
          prev
            ? {
                ...prev,
                likes: isLiked ? (prev.likes || 0) - 1 : (prev.likes || 0) + 1,
                likedBy: isLiked
                  ? (prev.likedBy || []).filter((id) => id !== user.uid)
                  : [...(prev.likedBy || []), user.uid],
              }
            : null
        );
      }
    } catch (error) {
      console.error("Error updating like:", error);
    }
  };

  const handleShare = async (postId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    try {
      const url = `${window.location.origin}/post/${postId}`;

      if (!isFirebaseConfigured || !db) {
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard!");
        return;
      }

      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        shares: increment(1),
      });

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, shares: (p.shares || 0) + 1 } : p
        )
      );

      if (featuredPost?.id === postId) {
        setFeaturedPost((prev) =>
          prev ? { ...prev, shares: (prev.shares || 0) + 1 } : null
        );
      }

      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    } catch (error) {
      console.error("Error sharing post:", error);
    }
  };

  const handleReport = async (postId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (!user || !isFirebaseConfigured) {
      alert("Please log in to report posts");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to report this post?"
    );
    if (!confirmed) return;

    if (!db) return;

    const postRef = doc(db, "posts", postId);
    try {
      await updateDoc(postRef, {
        reports: increment(1),
      });

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, reports: (p.reports || 0) + 1 } : p
        )
      );
      alert("Post reported. Thank you for helping keep our community safe.");
    } catch (error) {
      console.error("Error reporting post:", error);
    }
  };

  const handleMouseEnter = (postId: string) => {
    const timeout = setTimeout(() => {
      setHoveredPost(postId);
    }, 1000);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setHoveredPost(null);
  };

  const getSummary = (content: string) => {
    if (!content) return "";
    const sentences = content.split(".").filter((s) => s.trim().length > 0);
    return (
      sentences.slice(0, 2).join(".") + (sentences.length > 2 ? "..." : "")
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "";
    }
  };

  // Show loading spinner while loading
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Unable to load posts</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchPosts}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show empty state only after loading is complete
  if (posts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No posts yet</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Be the first to share something with the community!
          </p>
          <Link
            href="/create"
            className="inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors font-medium"
          >
            <Edit className="h-4 w-4 mr-2" />
            Create First Post
          </Link>
        </div>
      </div>
    );
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
                  <Link href={`/post/${post.id}`} className="block">
                    <div className="p-3 md:p-4">
                      <h3 className="font-medium text-sm leading-tight mb-2">
                        {post.title}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        by @{post.authorName}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-3 md:space-x-4">
                          <div className="flex items-center space-x-1">
                            <ArrowUp className="h-3 w-3" />
                            <span>{post.likes || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="h-3 w-3" />
                            <span>{post.comments || 0}</span>
                          </div>
                        </div>
                        {post.createdAt && (
                          <span className="text-xs">
                            {formatDate(post.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* AI Summary Tooltip */}
                  {hoveredPost === post.id && post.content && (
                    <div className="absolute z-10 top-full left-0 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                      <div className="text-xs font-semibold text-purple-600 mb-1">
                        TL;DR
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {getSummary(post.content)}
                      </div>
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
              {featuredPost.images && featuredPost.images.length > 0 && (
                <div className="relative h-48 md:h-64 lg:h-80">
                  <img
                    src={featuredPost.images[0]}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() =>
                      setSelectedImage({
                        src: featuredPost.images[0],
                        alt: featuredPost.title,
                      })
                    }
                  />
                </div>
              )}
              <Link href={`/post/${featuredPost.id}`} className="block">
                <div className="p-4 md:p-6">
                  <div className="flex items-center space-x-2 mb-2">
                    {featuredPost.category && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                        {featuredPost.category}
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2 hover:text-purple-600 transition-colors">
                    {featuredPost.title}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    by @{featuredPost.authorName}
                    {featuredPost.createdAt && (
                      <span className="ml-2">
                        • {formatDate(featuredPost.createdAt)}
                      </span>
                    )}
                  </p>
                  {featuredPost.content && (
                    <p className="text-gray-600 dark:text-gray-400 mb-4 md:mb-6 text-sm md:text-base">
                      {getSummary(featuredPost.content)}
                    </p>
                  )}

                  {/* AI Summary Section */}
                  {featuredPost.content && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mb-4">
                      <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
                        AI Summary (TL;DR)
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {getSummary(featuredPost.content)}
                      </div>
                    </div>
                  )}
                </div>
              </Link>

              <div className="px-4 md:px-6 pb-4 md:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center space-x-4 md:space-x-6">
                    <button
                      onClick={(e) => handleLike(featuredPost.id, e)}
                      className={`flex items-center space-x-2 hover:text-purple-600 transition-colors ${
                        user && featuredPost.likedBy?.includes(user.uid)
                          ? "text-purple-600"
                          : ""
                      }`}
                    >
                      <ArrowUp className="h-4 w-4" />
                      <span className="font-medium text-sm md:text-base">
                        {featuredPost.likes || 0} upvotes
                      </span>
                    </button>
                    <Link
                      href={`/post/${featuredPost.id}`}
                      className="flex items-center space-x-2 hover:text-purple-600 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-sm md:text-base">
                        {featuredPost.comments || 0} comments
                      </span>
                    </Link>
                    <button
                      onClick={(e) => handleShare(featuredPost.id, e)}
                      className="flex items-center space-x-2 hover:text-purple-600 transition-colors"
                    >
                      <Share className="h-4 w-4" />
                      <span className="text-sm md:text-base">Share</span>
                    </button>
                    <button
                      onClick={(e) => handleReport(featuredPost.id, e)}
                      className="flex items-center space-x-2 hover:text-red-600 transition-colors"
                    >
                      <Flag className="h-4 w-4" />
                      <span className="text-sm md:text-base">Report</span>
                    </button>
                  </div>
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
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Stay updated with the latest posts.
              </p>
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md transition-colors font-medium">
                SUBSCRIBE
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
                  <span>Submit a Post</span>
                </Link>
                <div className="flex items-center space-x-3 text-sm cursor-pointer hover:text-purple-600 transition-colors">
                  <Megaphone className="h-4 w-4" />
                  <span>Advertise</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Posts */}
          {posts.length > 0 && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm">
              <div className="p-4 md:p-6">
                <div className="flex items-center space-x-2 mb-2">
                  <Trophy className="h-5 w-5 text-purple-600" />
                  <h3 className="font-bold">Top Posts</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Most popular posts this week.
                </p>
                <div className="space-y-4">
                  {posts.slice(0, 3).map((post, index) => (
                    <Link key={post.id} href={`/post/${post.id}`}>
                      <div className="flex items-start space-x-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 -m-2 rounded-lg transition-colors">
                        <span className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 px-2.5 py-0.5 text-xs font-semibold">
                          #{index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="flex h-6 w-6 shrink-0 overflow-hidden rounded-full bg-purple-100 dark:bg-purple-900/50">
                              <span className="flex h-full w-full items-center justify-center text-xs font-medium text-purple-600 dark:text-purple-300">
                                {post.authorName?.charAt(0)?.toUpperCase() ||
                                  "?"}
                              </span>
                            </div>
                            <span className="font-medium text-sm truncate">
                              {post.authorName}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight mb-2 line-clamp-2">
                            {post.title}
                          </p>
                          <div className="flex items-center space-x-1">
                            <ArrowUp className="h-3 w-3" />
                            <span className="text-xs">{post.likes || 0}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
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
  );
}
