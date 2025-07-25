"use client";

import Link from "next/link";
import { ArrowUp, MessageCircle, Share, Flag, Eye, Clock, User, Calendar } from "lucide-react";
import { useState } from "react";

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
  views?: number;
}

interface PostCardProps {
  post: Post;
  searchTerm?: string;
  onLike?: (postId: string, e?: React.MouseEvent) => void;
  onShare?: (postId: string, e?: React.MouseEvent) => void;
  onReport?: (postId: string, e?: React.MouseEvent) => void;
  currentUserId?: string;
  showActions?: boolean;
  variant?: 'default' | 'compact' | 'featured';
}

export default function PostCard({ 
  post, 
  searchTerm = "",
  onLike,
  onShare,
  onReport,
  currentUserId,
  showActions = true,
  variant = 'default'
}: PostCardProps) {
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

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

  const getExcerpt = (content: string, maxLength = 150) => {
    if (!content) return "";
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength).trim() + "...";
  };

  const getSummary = (content: string) => {
    if (!content) return "";
    const sentences = content.split(".").filter((s) => s.trim().length > 0);
    return (
      sentences.slice(0, 2).join(".") + (sentences.length > 2 ? "..." : "")
    );
  };

  const getReadingTime = (content: string) => {
    if (!content) return 0;
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === searchTerm.toLowerCase()) {
        return <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 rounded px-1">{part}</mark>;
      }
      return part;
    });
  };

  const handleMouseEnter = () => {
    const timeout = setTimeout(() => {
      setHoveredPost(post.id);
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

  if (variant === 'compact') {
    return (
      <div
        className="relative rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm hover:shadow-md transition-all cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Link href={`/post/${post.id}`} className="block">
          <div className="p-3 md:p-4">
            <div className="flex items-center space-x-2 mb-2">
              {post.category && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                  {post.category}
                </span>
              )}
            </div>
            <h3 className="font-medium text-sm leading-tight mb-2 line-clamp-2">
              {highlightSearchTerm(post.title, searchTerm)}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              by @{highlightSearchTerm(post.authorName, searchTerm)}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <ArrowUp className="h-3 w-3" />
                  <span>{post.likes || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageCircle className="h-3 w-3" />
                  <span>{post.comments || 0}</span>
                </div>
              </div>
              <span>{formatDate(post.createdAt)}</span>
            </div>
          </div>
        </Link>

        {/* AI Summary Tooltip */}
        {hoveredPost === post.id && post.content && (
          <div className="absolute z-10 top-full left-0 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
            <div className="text-xs font-semibold text-purple-600 mb-1">
              ✨ TL;DR
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {getSummary(post.content)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <article className="bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 overflow-hidden group">
      {/* Image */}
      {post.images && post.images.length > 0 && (
        <div className="relative overflow-hidden">
          <img
            src={post.images[0]}
            alt={post.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/90 text-purple-800 backdrop-blur-sm">
              {post.category}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Category badge (if no image) */}
        {(!post.images || post.images.length === 0) && post.category && (
          <div className="mb-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
              {post.category}
            </span>
          </div>
        )}

        {/* Title */}
        <Link href={`/post/${post.id}`}>
          <h3 className="text-xl font-semibold mb-3 line-clamp-2 group-hover:text-purple-600 transition-colors cursor-pointer">
            {highlightSearchTerm(post.title, searchTerm)}
          </h3>
        </Link>

        {/* Content preview */}
        <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3 leading-relaxed">
          {highlightSearchTerm(getExcerpt(post.content), searchTerm)}
        </p>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                #{highlightSearchTerm(tag, searchTerm)}
              </span>
            ))}
            {post.tags.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{post.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Author and metadata */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>@{highlightSearchTerm(post.authorName, searchTerm)}</span>
          </div>
          <div className="flex items-center space-x-4">
            {getReadingTime(post.content) > 0 && (
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{getReadingTime(post.content)} min</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(post.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Stats and Actions */}
        {showActions && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center space-x-4">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onLike?.(post.id, e);
                }}
                className={`flex items-center space-x-1 text-sm transition-colors ${
                  currentUserId && post.likedBy?.includes(currentUserId)
                    ? "text-purple-600"
                    : "text-gray-600 dark:text-gray-400 hover:text-purple-600"
                }`}
              >
                <ArrowUp className="h-4 w-4" />
                <span>{post.likes || 0}</span>
              </button>
              
              <Link 
                href={`/post/${post.id}`}
                className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{post.comments || 0}</span>
              </Link>
              
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onShare?.(post.id, e);
                }}
                className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 transition-colors"
              >
                <Share className="h-4 w-4" />
                <span>Share</span>
              </button>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              {post.views && (
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{post.views.toLocaleString()}</span>
                </div>
              )}
              
              {onReport && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onReport(post.id, e);
                  }}
                  className="flex items-center space-x-1 hover:text-red-600 transition-colors"
                >
                  <Flag className="h-4 w-4" />
                  <span className="hidden sm:inline">Report</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
