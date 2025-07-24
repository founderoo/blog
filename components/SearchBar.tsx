"use client"

import { useState } from "react";
import { Search, Filter, X } from "lucide-react";

interface SearchBarProps {
  searchTerm: string;
  selectedCategory: string;
  categories: string[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (category: string) => void;
  onClearFilters: () => void;
  placeholder?: string;
}

export default function SearchBar({
  searchTerm,
  selectedCategory,
  categories,
  onSearchChange,
  onCategoryChange,
  onClearFilters,
  placeholder = "Search posts, authors, or content..."
}: SearchBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleCategoryChange = (category: string) => {
    onCategoryChange(category);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    onClearFilters();
    setShowFilters(false);
  };

  return (
    <div className="mb-6">
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <div className="flex items-center bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-500"
              />
            </div>
            <div className="flex items-center space-x-2 px-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  selectedCategory !== "all" 
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                    : "text-gray-600 dark:text-gray-400 hover:text-purple-600"
                }`}
              >
                <Filter className="h-4 w-4" />
                <span className="text-sm">Filter</span>
              </button>
              {(searchTerm || selectedCategory !== "all") && (
                <button
                  onClick={handleClearFilters}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Clear filters"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Category Filter Dropdown */}
          {showFilters && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-10">
              <div className="p-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Filter by Category</h3>
                <div className="space-y-2">
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
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>Active filters:</span>
            {searchTerm && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded-md">
                Search: "{searchTerm}"
              </span>
            )}
            {selectedCategory !== "all" && (
              <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 rounded-md">
                Category: {selectedCategory}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}