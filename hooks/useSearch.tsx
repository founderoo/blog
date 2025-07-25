import { useState, useEffect, useMemo } from 'react';

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  authorName: string;
  createdAt: any;
  likes: number;
  comments: number;
  views?: number;
}

interface SearchSuggestion {
  type: 'title' | 'author' | 'tag' | 'content';
  value: string;
  count: number;
}

export function useSearch(posts: Post[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Generate categories from posts
  const categories = useMemo(() => {
    return Array.from(new Set(posts.map(post => post.category).filter(Boolean)));
  }, [posts]);

  // Generate search suggestions
  const searchSuggestions = useMemo(() => {
    const suggestions = new Map<string, { type: string; count: number }>();

    posts.forEach(post => {
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
  }, [posts]);

  // Filter posts based on search criteria
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      // Category filter
      const matchesCategory = selectedCategory === "all" || post.category === selectedCategory;
      
      // Search filter
      const matchesSearch = searchTerm === "" ||
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.tags && post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
      
      return matchesCategory && matchesSearch;
    });
  }, [posts, searchTerm, selectedCategory]);

  // Get relevance score for sorting
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

  // Sort filtered posts by relevance when searching
  const sortedPosts = useMemo(() => {
    if (!searchTerm.trim()) {
      return filteredPosts;
    }

    return [...filteredPosts].sort((a, b) => {
      const aScore = getRelevanceScore(a, searchTerm);
      const bScore = getRelevanceScore(b, searchTerm);
      return bScore - aScore;
    });
  }, [filteredPosts, searchTerm]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
  };

  return {
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    categories,
    searchSuggestions,
    filteredPosts: sortedPosts,
    clearFilters,
    resultsCount: sortedPosts.length
  };
}
