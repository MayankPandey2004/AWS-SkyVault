import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from "@clerk/themes";

import App from './App.tsx';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#3b82f6",
          colorBackground: "#0f172a",
          colorText: "#f8fafc",
          borderRadius: "0.5rem",
        },
        elements: {
          card: "bg-gray-900 border border-gray-700 shadow-xl",
          formButtonPrimary:
            "bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg",
          headerTitle: "text-xl font-bold text-white",
          headerSubtitle: "text-gray-400",
          socialButtonsBlockButton:
            "bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white",
          footer: "hidden",

          userButtonPopoverCard: "bg-gray-800 border border-gray-700",
          userButtonPopoverActionButton:
            "text-gray-200 hover:text-white hover:bg-gray-700",
          userButtonPopoverActionButtonIcon: "text-blue-400",
        },
        layout: {
          unsafe_disableDevelopmentModeWarnings: true,
        },
      }}
    >
      <App />
    </ClerkProvider>

  </StrictMode>
);
