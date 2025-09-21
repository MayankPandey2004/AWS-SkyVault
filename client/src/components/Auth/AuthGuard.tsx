"use client"

import React, { useEffect, useState } from "react"
import { useUser, SignIn, SignUp } from "@clerk/clerk-react"
import { Loader2, Shield, Lock, Database } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isLoaded, isSignedIn } = useUser()
  const [showLanding, setShowLanding] = useState(true)

  // Show landing for ~1.5s on reload
  useEffect(() => {
    const timer = setTimeout(() => setShowLanding(false), 1500)
    return () => clearTimeout(timer)
  }, [])

  if (showLanding) {
    return <LandingScreen />
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-200">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center 
        bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 px-4 relative overflow-hidden">

        {/* Main Card */}
        <div
          className="flex w-full max-w-5xl relative z-10
            bg-slate-700/50 backdrop-blur-xl 
            rounded-2xl shadow-2xl overflow-hidden 
            border border-slate-500/40 transform transition hover:scale-[1.01]"
        >
          {/* Left: Vault Image */}
          <div className="hidden md:flex md:w-1/2 relative">
            <img
              src="/vault-login.jpg"
              alt="AWS SkyVault"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent"></div>
            <div className="absolute bottom-6 left-6 text-white">
              <h2 className="text-2xl font-bold">AWS SkyVault</h2>
              <p className="text-gray-300 text-sm">Advanced File Encryption & Deduplication</p>
            </div>
          </div>

          {/* Right: Auth Tabs */}
          <div className="w-full md:w-1/2 p-8 flex items-center justify-center bg-slate-900/40">
            <div className="w-full max-w-sm">
              {/* Branding */}
              <div className="text-center mb-6">
                <div className="flex justify-center gap-3 mb-3">
                  <Shield className="w-6 h-6 text-blue-400" />
                  <Lock className="w-6 h-6 text-cyan-400" />
                  <Database className="w-6 h-6 text-purple-400" />
                </div>
                <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
                <p className="text-sm text-gray-400">Login to your vault</p>
              </div>
              <AuthTabs />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

/* 🌟 Landing Splash Screen */
const LandingScreen = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center 
      bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-center px-4">

      <div className="animate-bounce mb-6">
        <Shield className="w-16 h-16 text-blue-400" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">AWS SkyVault</h1>
      <p className="text-gray-400 text-sm mb-8">Secure. Encrypted. Deduplicated.</p>
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  )
}

/* --- AuthTabs --- */
const AuthTabs: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<"signin" | "signup">("signin")

  return (
    <div>
      {/* Tabs */}
      <div className="flex mb-3 bg-slate-800/80 rounded-md p-1">
        <button
          onClick={() => setActiveTab("signin")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${activeTab === "signin"
              ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow"
              : "text-gray-400 hover:text-white hover:bg-slate-700/50"
            }`}
        >
          Sign In
        </button>
        <button
          onClick={() => setActiveTab("signup")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${activeTab === "signup"
              ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow"
              : "text-gray-400 hover:text-white hover:bg-slate-700/50"
            }`}
        >
          Sign Up
        </button>
      </div>

      {/* Test Accounts Info - compact */}
      {activeTab === "signin" && (
        <div className="mb-3 p-2 rounded-md bg-slate-800/60 border border-slate-600 text-xs text-gray-300">
          <p className="font-semibold text-white mb-1">Test Users</p>
          <p>
            <span className="text-blue-400">User:</span> testuser@user.com /{" "}
            <span className="text-cyan-400">SkyVault#123</span>
          </p>
          <p>
            <span className="text-blue-400">Admin:</span> testuser@admin.com /{" "}
            <span className="text-cyan-400">SkyVault#123</span>
          </p>
        </div>
      )}

      {/* Clerk Auth */}
      {activeTab === "signin" ? (
        <SignIn
          appearance={{
            elements: {
              card: "bg-transparent shadow-none",
              headerTitle: "text-white text-xl font-semibold",
              headerSubtitle: "text-gray-400",
              socialButtonsBlockButton:
                "bg-slate-800 border border-slate-700 text-white hover:bg-slate-700",
              formFieldInput:
                "bg-slate-900 border border-slate-700 text-white placeholder:text-gray-500 focus:border-blue-500",
              formButtonPrimary:
                "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg",
              footerActionLink: "text-blue-400 hover:text-blue-300",
              formFieldLabel: "text-gray-300 font-medium",
            },
          }}
        />
      ) : (
        <SignUp
          appearance={{
            elements: {
              card: "bg-transparent shadow-none !p-4 !min-h-[400px]",
              headerTitle: "text-white text-xl font-semibold",
              headerSubtitle: "text-gray-400",
              socialButtonsBlockButton:
                "bg-slate-800 border border-slate-700 text-white hover:bg-slate-700",
              formFieldInput:
                "bg-slate-900 border border-slate-700 text-white placeholder:text-gray-500 focus:border-blue-500",
              formButtonPrimary:
                "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg",
              footerActionLink: "text-blue-400 hover:text-blue-300",
              formFieldLabel: "text-gray-300 font-medium",
            },
          }}
        />
      )}
    </div>
  )
}

