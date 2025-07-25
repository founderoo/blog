"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Filter, X, Tag, User, FileText } from "lucide-react";

interface SearchBarProps {
  searchTerm: string;
  selectedCategory: string;
  categories: string[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (category: string) => void;
  onClearFilters: () => void;
  placeholder?: string;
  searchSuggestions?: SearchSuggestion[];
  isLoading?: boolean;
  showStats?: boolean;
  resultsCount?: number;
}

interface SearchSuggestion {
  type: 'title' | 'author' | 'tag' | 'content';
  value: string;
  count?: number;
}

export default function SearchBar({
  searchTerm,
  selectedCategory,
  categories,
  onSearchChange,
  onCategoryChange,
  onClearFilters,
  placeholder = "Search posts, authors, tags, or content...",
  searchSuggestions = [],
  isLoading = false,
  showStats = true,
  resultsCount = 0
}: SearchBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedSuggestion, setFocusedSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on search term
  const filteredSuggestions = searchSuggestions.filter(suggestion =>
    suggestion.value.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 8);

  const handleSearchChange = (value: string) => {
    onSearchChange(value);
    setShowSuggestions(value.length > 0 && filteredSuggestions.length > 0);
    setFocusedSuggestion(-1);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onSearchChange(suggestion.value);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedSuggestion(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedSuggestion(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedSuggestion >= 0) {
          handleSuggestionClick(filteredSuggestions[focusedSuggestion]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setFocusedSuggestion(-1);
        break;
    }
  };

  const handleCategoryChange = (category: string) => {
    onCategoryChange(category);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    onClearFilters();
    setShowFilters(false);
    setShowSuggestions(false);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'author': return <User className="h-3 w-3" />;
      case 'tag': return <Tag className="h-3 w-3" />;
      case 'title': return <FileText className="h-3 w-3" />;
      default: return <Search className="h-3 w-3" />;
    }
  };

  const getSuggestionLabel = (type: string) => {
    switch (type) {
      case 'author': return 'Author';
      case 'tag': return 'Tag';
      case 'title': return 'Title';
      case 'content': return 'Content';
      default: return 'Search';
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="mb-6">
      <div className="max-w-2xl mx-auto relative" ref={suggestionsRef}>
        <div className="relative">
          <div className="flex items-center bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500 transition-all">
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isLoading ? 'animate-pulse' : ''} text-gray-400`} />
              <input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => searchTerm.length > 0 && filteredSuggestions.length > 0 && setShowSuggestions(true)}
                className="w-full pl-10 pr-4 py-3 bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-500"
                autoComplete="off"
              />
            </div>
            <div className="flex items-center space-x-2 px-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  selectedCategory !== "all" 
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                    : "text-gray-600 dark:text-gray-400 hover:text-purple-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <Filter className="h-4 w-4" />
                <span className="text-sm hidden sm:inline">Filter</span>
                {selectedCategory !== "all" && (
                  <span className="ml-1 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs px-1.5 py-0.5 rounded-full">
                    1
                  </span>
                )}
              </button>
              {(searchTerm || selectedCategory !== "all") && (
                <button
                  onClick={handleClearFilters}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Clear filters"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Search Suggestions */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
              <div className="p-2">
                <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1 mb-1">
                  Suggestions
                </div>
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.type}-${suggestion.value}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                      index === focusedSuggestion
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {getSuggestionIcon(suggestion.type)}
                      <span className="truncate">{suggestion.value}</span>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        {getSuggestionLabel(suggestion.type)}
                      </span>
                      {suggestion.count && (
                        <span className="text-xs text-gray-400">
                          {suggestion.count}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Category Filter Dropdown */}
          {showFilters && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-10">
              <div className="p-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Filter by Category</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <button
                    onClick={() => handleCategoryChange("all")}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedCategory === "all"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => handleCategoryChange(category)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedCategory === category
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Active Filters Display */}
        {(searchTerm || selectedCategory !== "all") && (
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>Active filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded-md">
                  <Search className="h-3 w-3 mr-1" />
                  Search: "{searchTerm}"
                  <button
                    onClick={() => onSearchChange("")}
                    className="ml-1 hover:text-blue-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedCategory !== "all" && (
                <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 rounded-md">
                  <Filter className="h-3 w-3 mr-1" />
                  Category: {selectedCategory}
                  <button
                    onClick={() => onCategoryChange("all")}
                    className="ml-1 hover:text-purple-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
            {showStats && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {resultsCount} {resultsCount === 1 ? 'result' : 'results'} found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
