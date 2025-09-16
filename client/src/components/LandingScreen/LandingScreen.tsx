// components/LandingScreen.tsx
import { Shield, Lock, Database } from "lucide-react"

interface LandingScreenProps {
  onStart: () => void
}

export const LandingScreen = ({ onStart }: LandingScreenProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-cyan-500/20 blur-3xl"></div>

      {/* Content */}
      <div className="relative z-10 max-w-3xl">
        <div className="flex justify-center gap-3 mb-6">
          <Shield className="w-10 h-10 text-blue-400" />
          <Lock className="w-10 h-10 text-cyan-400" />
          <Database className="w-10 h-10 text-purple-400" />
        </div>

        <h1 className="text-5xl font-extrabold text-white mb-4">
          Welcome to <span className="text-blue-400">SecureVault</span>
        </h1>
        <p className="text-lg text-gray-300 mb-8">
          Encrypt, deduplicate, and manage your files with enterprise-grade security.
        </p>

        <button
          onClick={onStart}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-cyan-700 transition-all"
        >
          Get Started
        </button>
      </div>
    </div>
  )
}
