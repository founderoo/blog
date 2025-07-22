"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useTheme } from "@/contexts/ThemeContext"
import { Sun, Moon, Menu, X, LogOut, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout, isFirebaseConfigured } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Firebase Configuration Warning */}
      {!isFirebaseConfigured && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">
                <strong>Demo Mode:</strong> Firebase is not configured. Authentication and data persistence are
                disabled.
                <a
                  href="https://console.firebase.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 underline hover:no-underline"
                >
                  Set up Firebase →
                </a>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <span className="font-bold text-xl">Founderoo</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/" className="hover:text-purple-600 transition-colors">
                Home
              </Link>
              <Link href="/create" className="hover:text-purple-600 transition-colors">
                Create Post
              </Link>
              {isFirebaseConfigured ? (
                user ? (
                  <div className="flex items-center space-x-4">
                    <Link href="/account" className="hover:text-purple-600 transition-colors">
                      Account
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-1 hover:text-purple-600 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-4">
                    <Link href="/login" className="hover:text-purple-600 transition-colors">
                      Login
                    </Link>
                    <Link
                      href="/register"
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors"
                    >
                      Register
                    </Link>
                  </div>
                )
              ) : (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-500 text-sm">Auth disabled (Demo mode)</span>
                </div>
              )}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-800">
              <nav className="flex flex-col space-y-4">
                <Link href="/" className="hover:text-purple-600 transition-colors">
                  Home
                </Link>
                <Link href="/create" className="hover:text-purple-600 transition-colors">
                  Create Post
                </Link>
                {isFirebaseConfigured ? (
                  user ? (
                    <>
                      <Link href="/account" className="hover:text-purple-600 transition-colors">
                        Account
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-1 hover:text-purple-600 transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="hover:text-purple-600 transition-colors">
                        Login
                      </Link>
                      <Link href="/register" className="hover:text-purple-600 transition-colors">
                        Register
                      </Link>
                    </>
                  )
                ) : (
                  <span className="text-gray-500 text-sm">Authentication disabled (Demo mode)</span>
                )}
                <button
                  onClick={toggleTheme}
                  className="flex items-center space-x-2 hover:text-purple-600 transition-colors text-left"
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </button>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  )
}
