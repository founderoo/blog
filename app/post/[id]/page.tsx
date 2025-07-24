"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
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
  Calendar,
  Eye,
  Clock,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import ImageModal from "@/components/ImageModal";
import CloudinaryImage from "@/components/CloudinaryImage";
import LoadingSpinner from "@/components/LoadingSpinner";
import Comments from "@/components/Comments";

interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: any;
  updatedAt?: any;
  likes: number;
  likedBy: string[];
  replies?: Comment[];
  parentId?: string; // For nested replies
}

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  images: string[]; // Cloudinary URLs
  authorId: string;
  authorName: string;
  createdAt: any;
  updatedAt?: any;
  likes: number;
  comments: number;
  shares: number;
  reports: number;
  views?: number;
  likedBy: string[];
}

export default function PostPage() {
  const params = useParams();
    if (!params) return null;
  const postId = params.id as string;
  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const { user } = useAuth();
  const [commentsCount, setCommentsCount] = useState(0);

  // Add this new useEffect after your existing useEffect
  useEffect(() => {
    if (post) {
      setCommentsCount(post.comments || 0);
      console.log("📊 Comments count set to:", post.comments || 0);
    }
  }, [post]);

  useEffect(() => {
    if (postId) {
      fetchPost();
      incrementViewCount();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      const postDoc = await getDoc(doc(db, "posts", postId));
      if (postDoc.exists()) {
        const postData = { id: postDoc.id, ...postDoc.data() } as Post;
        setPost(postData);
        setCommentsCount(postData.comments || 0); // Set comments count here

        // Fetch related posts
        const relatedQuery = query(
          collection(db, "posts"),
          where("category", "==", postData.category),
          limit(6)
        );
        const relatedSnapshot = await getDocs(relatedQuery);
        const relatedData = relatedSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as Post))
          .filter((p) => p.id !== postId);

        setRelatedPosts(relatedData.slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching post:", error);
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async () => {
    if (!user) return; // Only count views for logged-in users
    
    try {
      const postRef = doc(db, "posts", postId);
      const postDoc = await getDoc(postRef);
      
      if (postDoc.exists()) {
        const postData = postDoc.data();
        const viewedBy = postData.viewedBy || [];
        
        // Only increment if user hasn't viewed this post before
        if (!viewedBy.includes(user.uid)) {
          await updateDoc(postRef, {
            views: increment(1),
            viewedBy: arrayUnion(user.uid),
          });
        }
      }
    } catch (error) {
      console.error("Error incrementing view count:", error);
    }
  };

  const handleLike = async () => {
    if (!user || !post) return;

    setActionLoading("like");
    const isLiked = post.likedBy.includes(user.uid);
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

      setPost((prev) =>
        prev
          ? {
              ...prev,
              likes: isLiked ? prev.likes - 1 : prev.likes + 1,
              likedBy: isLiked
                ? prev.likedBy.filter((id) => id !== user.uid)
                : [...prev.likedBy, user.uid],
            }
          : null
      );
    } catch (error) {
      console.error("Error updating like:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleShare = async () => {
    if (!post) return;

    setActionLoading("share");
    const postRef = doc(db, "posts", postId);

    try {
      await updateDoc(postRef, {
        shares: increment(1),
      });

      setPost((prev) => (prev ? { ...prev, shares: prev.shares + 1 } : null));

      // Enhanced sharing with fallback
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: getSummary(post.content),
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing post:", error);
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      } catch (clipboardError) {
        console.error("Clipboard error:", clipboardError);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleReport = async () => {
    if (!user || !post) return;

    const confirmed = window.confirm(
      "Are you sure you want to report this post?"
    );
    if (!confirmed) return;

    setActionLoading("report");
    const postRef = doc(db, "posts", postId);

    try {
      await updateDoc(postRef, {
        reports: increment(1),
      });

      setPost((prev) => (prev ? { ...prev, reports: prev.reports + 1 } : null));
      alert("Post reported. Thank you for helping keep our community safe.");
    } catch (error) {
      console.error("Error reporting post:", error);
      alert("Failed to report post. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const getSummary = (content: string) => {
    const sentences = content.split(".").filter((s) => s.trim().length > 0);
    return (
      sentences.slice(0, 2).join(".") + (sentences.length > 2 ? "..." : "")
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);
    return readingTime;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-96">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The post you're looking for doesn't exist or has been removed.
          </p>
          <Link
            href="/"
            className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium"
          >
            <ArrowUp className="h-4 w-4 mr-2 rotate-180" />
            Go back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <article className="bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                  {post.category}
                </span>
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                {post.title}
              </h1>

              <div className="flex items-center justify-between flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    By{" "}
                    <span className="font-medium ml-1">@{post.authorName}</span>
                  </span>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{getReadingTime(post.content)} min read</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {post.views && (
                    <div className="flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span>{post.views.toLocaleString()} views</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Summary */}
            <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center mb-2">
                <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                  ✨ AI Summary (TL;DR)
                </div>
              </div>
              <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {getSummary(post.content)}
              </div>
            </div>

            {/* Cloudinary Images */}
            {post.images.length > 0 && (
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <div
                  className={`grid gap-4 ${
                    post.images.length === 1
                      ? "grid-cols-1"
                      : post.images.length === 2
                      ? "grid-cols-1 md:grid-cols-2"
                      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  }`}
                >
                  {post.images.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <CloudinaryImage
                        src={imageUrl}
                        alt={`${post.title} - Image ${index + 1}`}
                        width={post.images.length === 1 ? 800 : 400}
                        height={post.images.length === 1 ? 400 : 250}
                        className={`w-full object-cover rounded-lg cursor-pointer transition-all duration-300 group-hover:shadow-lg group-hover:scale-[1.02] ${
                          post.images.length === 1 ? "h-96" : "h-64"
                        }`}
                        onClick={() =>
                          setSelectedImage({
                            src: imageUrl,
                            alt: `${post.title} - Image ${index + 1}`,
                          })
                        }
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 rounded-lg flex items-center justify-center">
                        <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="prose dark:prose-invert max-w-none prose-purple">
                {post.content.split("\n").map((paragraph, index) => (
                  <p
                    key={index}
                    className="mb-4 leading-relaxed text-gray-800 dark:text-gray-200"
                  >
                    {paragraph.trim() && paragraph}
                  </p>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <button
                    onClick={handleLike}
                    disabled={!user || actionLoading === "like"}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
                      user && post.likedBy.includes(user.uid)
                        ? "text-purple-600 bg-purple-50 dark:bg-purple-900/30"
                        : "text-gray-600 dark:text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                    } disabled:opacity-50`}
                  >
                    <ArrowUp className="h-5 w-5" />
                    <span className="font-medium">
                      {actionLoading === "like"
                        ? "Loading..."
                        : `${post.likes} upvotes`}
                    </span>
                  </button>

                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <MessageCircle className="h-5 w-5" />
                    <span>{commentsCount} comments</span>
                  </div>

                  <button
                    onClick={handleShare}
                    disabled={actionLoading === "share"}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all duration-200 disabled:opacity-50"
                  >
                    <Share className="h-5 w-5" />
                    <span>
                      {actionLoading === "share" ? "Sharing..." : "Share"}
                    </span>
                  </button>
                </div>

                <button
                  onClick={handleReport}
                  disabled={!user || actionLoading === "report"}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 disabled:opacity-50"
                >
                  <Flag className="h-4 w-4" />
                  <span className="text-sm">
                    {actionLoading === "report" ? "Reporting..." : "Report"}
                  </span>
                </button>
              </div>
            </div>
          </article>
          <Comments
            postId={postId}
            commentsCount={commentsCount}
            onCommentsCountChange={setCommentsCount}
          />
        </div>

        {/* Related Posts Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-6 sticky top-4">
            <h3 className="font-bold text-lg mb-4 flex items-center">
              Related Posts
              {relatedPosts.length > 0 && (
                <span className="ml-2 text-sm text-gray-500 font-normal">
                  ({relatedPosts.length})
                </span>
              )}
            </h3>

            {relatedPosts.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No related posts found.
              </p>
            ) : (
              <div className="space-y-4">
                {relatedPosts.map((relatedPost) => (
                  <Link key={relatedPost.id} href={`/post/${relatedPost.id}`}>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 cursor-pointer group">
                      {relatedPost.images.length > 0 && (
                        <CloudinaryImage
                          src={relatedPost.images[0]}
                          alt={relatedPost.title}
                          width={300}
                          height={120}
                          className="w-full h-20 object-cover rounded mb-2 group-hover:scale-[1.02] transition-transform duration-200"
                        />
                      )}
                      <h4 className="font-medium text-sm mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                        {relatedPost.title}
                      </h4>
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span className="truncate">
                          @{relatedPost.authorName}
                        </span>
                        <div className="flex items-center space-x-3 flex-shrink-0">
                          <div className="flex items-center space-x-1">
                            <ArrowUp className="h-3 w-3" />
                            <span>{relatedPost.likes}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="h-3 w-3" />
                            <span>{relatedPost.comments}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Image Modal */}
      <ImageModal
        src={selectedImage?.src || ""}
        alt={selectedImage?.alt || ""}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
