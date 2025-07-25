"use client";

import { useState, useEffect, useMemo } from "react";
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
  startAfter,
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
  Search,
  User,
  Calendar,
  Clock,
  Eye,
} from "lucide-react";
import Link from "next/link";
import ImageModal from "@/components/ImageModal";
import SearchBar from "@/components/SearchBar";

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

interface SearchSuggestion {
  type: 'title' | 'author' | 'tag' | 'content';
  value: string;
  count: number;
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [latestPosts, setLatestPosts] = useState<Post[]>([]);
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [featuredPost, setFeaturedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { user, isFirebaseConfigured } = useAuth();

  // Generate categories from posts
  const categories = useMemo(() => {
    return Array.from(new Set(allPosts.map(post => post.category).filter(Boolean)));
  }, [allPosts]);

  // Generate search suggestions
  const searchSuggestions = useMemo(() => {
    const suggestions = new Map<string, { type: string; count: number }>();

    allPosts.forEach(post => {
      // Authors
      const authorKey = `author:${post.authorName}`;
      suggestions.set(authorKey, {
        type: 'author',
        count: (suggestions.get(authorKey)?.count || 0) + 1
      });

      // Tags
      if (post.tags) {
        post.tags.forEach(tag => {
          const tagKey = `tag:${tag}`;
          suggestions.set(tagKey, {
            type: 'tag',
            count: (suggestions.get(tagKey)?.count || 0) + 1
          });
        });
      }

      // Title keywords
      const titleWords = post.title.toLowerCase().split(' ').filter(word => word.length > 3);
      titleWords.forEach(word => {
        const titleKey = `title:${word}`;
        suggestions.set(titleKey, {
          type: 'title',
          count: (suggestions.get(titleKey)?.count || 0) + 1
        });
      });
    });

    return Array.from(suggestions.entries())
      .map(([key, { type, count }]) => ({
        type: type as 'title' | 'author' | 'tag' | 'content',
        value: key.split(':')[1],
        count
      }))
      .filter(suggestion => suggestion.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [allPosts]);

  // Enhanced search function with relevance scoring
  const getRelevanceScore = (post: Post, searchTerm: string): number => {
    if (!searchTerm.trim()) return 0;
    
    const searchLower = searchTerm.toLowerCase();
    let score = 0;

    // Title matches get highest score
    if (post.title.toLowerCase().includes(searchLower)) {
      score += post.title.toLowerCase().indexOf(searchLower) === 0 ? 100 : 50;
    }

    // Author matches
    if (post.authorName.toLowerCase().includes(searchLower)) {
      score += 30;
    }

    // Tag matches
    if (post.tags) {
      post.tags.forEach(tag => {
        if (tag.toLowerCase().includes(searchLower)) {
          score += 20;
        }
      });
    }

    // Category matches
    if (post.category && post.category.toLowerCase().includes(searchLower)) {
      score += 15;
    }

    // Content matches (lower priority)
    if (post.content.toLowerCase().includes(searchLower)) {
      score += 5;
    }

    // Boost score based on post popularity
    score += Math.log(post.likes + 1) * 2;
    score += Math.log((post.views || 0) + 1) * 1;

    return score;
  };

  // Enhanced filter function
  const filterPosts = (postsToFilter: Post[]) => {
    let filtered = postsToFilter.filter(post => {
      const matchesSearch = searchTerm === "" ||
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.tags && post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) ||
        (post.category && post.category.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === "all" || post.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });

    // Sort by relevance when searching
    if (searchTerm.trim()) {
      filtered.sort((a, b) => {
        const aScore = getRelevanceScore(a, searchTerm);
        const bScore = getRelevanceScore(b, searchTerm);
        return bScore - aScore;
      });
    }

    return filtered;
  };

  // Apply filters to posts
  const filteredLatestPosts = filterPosts(latestPosts);
  const filteredFeedPosts = filterPosts(feedPosts);
  const filteredFeaturedPost = featuredPost && (filterPosts([featuredPost]).length > 0) ? featuredPost : null;
  const filteredAllPosts = filterPosts(allPosts);

  // Highlight search terms function
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
        limit(10)
      );

      const snapshot = await getDocs(postsQuery);
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];

      setPosts(postsData);
      setAllPosts(postsData);

      // Filter posts by age (1 hour = 3600000 milliseconds)
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);
      
      const recentPosts: Post[] = [];
      const olderPosts: Post[] = [];

      postsData.forEach(post => {
        const postDate = post.createdAt?.toDate ? post.createdAt.toDate() : new Date(post.createdAt);
        if (postDate >= oneHourAgo) {
          recentPosts.push(post);
        } else {
          olderPosts.push(post);
        }
      });

      setLatestPosts(recentPosts);
      setFeedPosts(olderPosts);

      // Set featured post from recent posts if available, otherwise from older posts
      if (recentPosts.length > 0) {
        setFeaturedPost(recentPosts[0]);
      } else if (olderPosts.length > 0) {
        setFeaturedPost(olderPosts[0]);
      }

      if (postsData.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      }
      
      setHasMore(postsData.length === 10);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setError("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (!hasMore || loadingMore || !lastVisible || !isFirebaseConfigured || !db) return;

    setLoadingMore(true);
    try {
      const morePostsQuery = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(10)
      );

      const snapshot = await getDocs(morePostsQuery);
      const newPosts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];

      if (newPosts.length > 0) {
        setPosts(prev => [...prev, ...newPosts]);
        setAllPosts(prev => [...prev, ...newPosts]);

        // Filter new posts by age
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 3600000);
        
        const newRecentPosts: Post[] = [];
        const newOlderPosts: Post[] = [];

        newPosts.forEach(post => {
          const postDate = post.createdAt?.toDate ? post.createdAt.toDate() : new Date(post.createdAt);
          if (postDate >= oneHourAgo) {
            newRecentPosts.push(post);
          } else {
            newOlderPosts.push(post);
          }
        });

        setLatestPosts(prev => [...prev, ...newRecentPosts]);
        setFeedPosts(prev => [...prev, ...newOlderPosts]);

        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(newPosts.length === 10);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more posts:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Infinite scroll logic
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop
          >= document.documentElement.offsetHeight - 1000) {
        loadMorePosts();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, lastVisible, isFirebaseConfigured]);

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

      setAllPosts((prev) =>
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

      setAllPosts((prev) =>
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

      setAllPosts((prev) =>
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

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
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
      {/* Enhanced Search Bar */}
      <SearchBar
        searchTerm={searchTerm}
        selectedCategory={selectedCategory}
        categories={categories}
        onSearchChange={handleSearchChange}
        onCategoryChange={handleCategoryChange}
        onClearFilters={clearFilters}
        searchSuggestions={searchSuggestions}
        showStats={true}
        resultsCount={filteredAllPosts.length}
        isLoading={loading || loadingMore}
      />

      {/* Search Results Info */}
      {(searchTerm || selectedCategory !== "all") && (
        <div className="mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                {searchTerm && selectedCategory !== "all" ? (
                  <>Showing results for "<strong>{searchTerm}</strong>" in <strong>{selectedCategory}</strong> category ({filteredAllPosts.length} found)</>
                ) : searchTerm ? (
                  <>Showing results for "<strong>{searchTerm}</strong>" ({filteredAllPosts.length} found)</>
                ) : (
                  <>Showing posts in <strong>{selectedCategory}</strong> category ({filteredAllPosts.length} found)</>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
        {/* Left Sidebar - Latest Posts */}
        <div className="lg:col-span-3 lg:order-1 order-2">
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-lg md:text-xl font-bold">
              {searchTerm || selectedCategory !== "all" ? "Latest Results" : "Latest Posts (Last Hour)"}
            </h2>
            <div className="space-y-3 md:space-y-4">
              {filteredLatestPosts.length > 0 ? filteredLatestPosts.filter(post => filteredFeaturedPost?.id !== post.id).map((post) => (
                <div
                  key={post.id}
                  className="relative rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onMouseEnter={() => handleMouseEnter(post.id)}
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
                        ✨ TL;DR
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {getSummary(post.content)}
                      </div>
                    </div>
                  )}
                </div>
              )) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {searchTerm || selectedCategory !== "all"
                      ? "No posts match your search criteria"
                      : "No posts from the last hour"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Featured Post and Feed */}
        <div className="lg:col-span-6 lg:order-2 order-1">
          <div className="space-y-6">
            {/* Featured Post */}
            {filteredFeaturedPost && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm overflow-hidden">
                {filteredFeaturedPost.images && filteredFeaturedPost.images.length > 0 && (
                  <div className="relative h-48 md:h-64 lg:h-80">
                    <img
                      src={filteredFeaturedPost.images[0]}
                      alt={filteredFeaturedPost.title}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() =>
                        setSelectedImage({
                          src: filteredFeaturedPost.images[0],
                          alt: filteredFeaturedPost.title,
                        })
                      }
                    />
                  </div>
                )}
                <Link href={`/post/${filteredFeaturedPost.id}`} className="block">
                  <div className="p-4 md:p-6">
                    <div className="flex items-center space-x-2 mb-2">
                      {filteredFeaturedPost.category && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                          {filteredFeaturedPost.category}
                        </span>
                      )}
                      {searchTerm && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">
                          Featured Result
                        </span>
                      )}
                    </div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2 hover:text-purple-600 transition-colors">
                      {highlightSearchTerm(filteredFeaturedPost.title, searchTerm)}
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      by @{highlightSearchTerm(filteredFeaturedPost.authorName, searchTerm)}
                      {filteredFeaturedPost.createdAt && (
                        <span className="ml-2">
                          • {formatDate(filteredFeaturedPost.createdAt)}
                        </span>
                      )}
                    </p>
                    {filteredFeaturedPost.content && (
                      <p className="text-gray-600 dark:text-gray-400 mb-4 md:mb-6 text-sm md:text-base">
                        {highlightSearchTerm(getSummary(filteredFeaturedPost.content), searchTerm)}
                      </p>
                    )}

                    {/* AI Summary Section */}
                    {filteredFeaturedPost.content && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mb-4">
                        <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
                          ✨ AI Summary (TL;DR)
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {getSummary(filteredFeaturedPost.content)}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>

                <div className="px-4 md:px-6 pb-4 md:pb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center space-x-4 md:space-x-6">
                      <button
                        onClick={(e) => handleLike(filteredFeaturedPost.id, e)}
                        className={`flex items-center space-x-2 hover:text-purple-600 transition-colors ${
                          user && filteredFeaturedPost.likedBy?.includes(user.uid)
                            ? "text-purple-600"
                            : ""
                        }`}
                      >
                        <ArrowUp className="h-4 w-4" />
                        <span className="font-medium text-sm md:text-base">
                          {filteredFeaturedPost.likes || 0} upvotes
                        </span>
                      </button>
                      <Link
                        href={`/post/${filteredFeaturedPost.id}`}
                        className="flex items-center space-x-2 hover:text-purple-600 transition-colors"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-sm md:text-base">
                          {filteredFeaturedPost.comments || 0} comments
                        </span>
                      </Link>
                      <button
                        onClick={(e) => handleShare(filteredFeaturedPost.id, e)}
                        className="flex items-center space-x-2 hover:text-purple-600 transition-colors"
                      >
                        <Share className="h-4 w-4" />
                        <span className="text-sm md:text-base">Share</span>
                      </button>
                      <button
                        onClick={(e) => handleReport(filteredFeaturedPost.id, e)}
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

            {/* Feed Posts */}
            {filteredFeedPosts.length > 0 && (
              <div className="space-y-6">
                {filteredFeedPosts.filter(post => filteredFeaturedPost?.id !== post.id).map((post) => (
                  <div
                    key={post.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {post.images && post.images.length > 0 && (
                      <div className="relative h-48 md:h-64">
                        <img
                          src={post.images[0]}
                          alt={post.title}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() =>
                            setSelectedImage({
                              src: post.images[0],
                              alt: post.title,
                            })
                          }
                        />
                      </div>
                    )}
                    <Link href={`/post/${post.id}`} className="block">
                      <div className="p-4 md:p-6">
                        <div className="flex items-center space-x-2 mb-2">
                          {post.category && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                              {post.category}
                            </span>
                          )}
                        </div>
                        <h2 className="text-lg md:text-xl font-bold mb-2 hover:text-purple-600 transition-colors">
                          {highlightSearchTerm(post.title, searchTerm)}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          by @{highlightSearchTerm(post.authorName, searchTerm)}
                          {post.createdAt && (
                            <span className="ml-2">
                              • {formatDate(post.createdAt)}
                            </span>
                          )}
                        </p>
                        {post.content && (
                          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm md:text-base">
                            {highlightSearchTerm(getSummary(post.content), searchTerm)}
                          </p>
                        )}
                      </div>
                    </Link>

                    <div className="px-4 md:px-6 pb-4 md:pb-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center space-x-4 md:space-x-6">
                          <button
                            onClick={(e) => handleLike(post.id, e)}
                            className={`flex items-center space-x-2 hover:text-purple-600 transition-colors ${
                              user && post.likedBy?.includes(user.uid)
                                ? "text-purple-600"
                                : ""
                            }`}
                          >
                            <ArrowUp className="h-4 w-4" />
                            <span className="font-medium text-sm md:text-base">
                              {post.likes || 0} upvotes
                            </span>
                          </button>
                          <Link
                            href={`/post/${post.id}`}
                            className="flex items-center space-x-2 hover:text-purple-600 transition-colors"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span className="text-sm md:text-base">
                              {post.comments || 0} comments
                            </span>
                          </Link>
                          <button
                            onClick={(e) => handleShare(post.id, e)}
                            className="flex items-center space-x-2 hover:text-purple-600 transition-colors"
                          >
                            <Share className="h-4 w-4" />
                            <span className="text-sm md:text-base">Share</span>
                          </button>
                          <button
                            onClick={(e) => handleReport(post.id, e)}
                            className="flex items-center space-x-2 hover:text-red-600 transition-colors"
                          >
                            <Flag className="h-4 w-4" />
                            <span className="text-sm md:text-base">Report</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No Results Message */}
            {(searchTerm || selectedCategory !== "all") && filteredAllPosts.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-600 mb-4">
                  <Search className="h-16 w-16 mx-auto mb-4" />
                </div>
                <h3 className="text-xl font-medium mb-2">No posts found</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Try adjusting your search criteria or filters.
                </p>
                <button
                  onClick={clearFilters}
                  className="text-purple-600 hover:text-purple-700 font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
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
          {filteredAllPosts.length > 0 && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm">
              <div className="p-4 md:p-6">
                <div className="flex items-center space-x-2 mb-2">
                  <Trophy className="h-5 w-5 text-purple-600" />
                  <h3 className="font-bold">
                    {searchTerm || selectedCategory !== "all" ? "Top Results" : "Top Posts"}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {searchTerm || selectedCategory !== "all" 
                    ? "Most relevant posts for your search." 
                    : "Most popular posts this week."}
                </p>
                <div className="space-y-4">
                  {filteredAllPosts
                    .slice()
                    .sort((a, b) => (b.likes || 0) - (a.likes || 0))
                    .slice(0, 3)
                    .map((post, index) => (
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
                            {highlightSearchTerm(post.title, searchTerm)}
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

      {/* Load More Button */}
      {hasMore && !searchTerm && selectedCategory === "all" && (
        <div className="text-center mt-8">
          <button
            onClick={loadMorePosts}
            disabled={loadingMore}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            {loadingMore ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Loading more posts...</span>
              </div>
            ) : (
              'Load More Posts'
            )}
          </button>
        </div>
      )}

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
