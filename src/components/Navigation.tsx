"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { UserDropdown } from "./UserDropdown";
import LanguageSelector from "./LanguageSelector";
import { useTranslations } from "@/hooks/useTranslations";
import {
  Home,
  Wrench,
  FileText,
  Cog,
  Building2,
  List,
  Settings,
  Menu,
  X,
} from "lucide-react";

const getNavigation = (t: (key: string) => string) => [
  { name: t('navigation.dashboard'), href: "/", icon: Home },
  { name: t('navigation.workOrders'), href: "/work-orders", icon: FileText },
  { name: t('navigation.machines'), href: "/machines", icon: Wrench },
  { name: t('navigation.machineModels'), href: "/machine-models", icon: Building2 },
  { name: t('navigation.maintenanceRanges'), href: "/maintenance-ranges", icon: List },
  { name: t('navigation.operations'), href: "/operations", icon: Cog },
  { name: t('navigation.settings'), href: "/settings", icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslations();
  const navigation = getNavigation(t);

  if (status === "loading") {
    return (
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-32 rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  if (!session) {
    return (
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center min-w-0 flex-1">
              <Wrench className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white truncate max-w-32 sm:max-w-none">
                Mantenimiento
              </span>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <LanguageSelector />
              <ThemeToggle compact />
              <Link
                href="/auth/signin"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap"
              >
                {t('auth.signIn')}
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center min-w-0 flex-1">
            <div className="flex-shrink-0 flex items-center">
              <Wrench className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white truncate max-w-32 sm:max-w-none">
                {session.user.company?.appName || "Mantenimiento"}
              </span>
            </div>

          </div>

          {/* Menu button - Always visible */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            <LanguageSelector />
            <ThemeToggle compact />
            <UserDropdown />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu - Always available */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="px-2 pt-2 pb-3 space-y-1 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          {navigation.map((item) => {
            // Extract the path without locale (e.g., /en/dashboard -> /dashboard)
            const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, '') || '/';
            const isActive = pathWithoutLocale === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors transform",
                  mobileMenuOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
                  isActive
                    ? "bg-gray-200 dark:bg-gray-700 border-blue-500 text-gray-900 dark:text-white"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300"
                )}
                style={{
                  transitionDelay: mobileMenuOpen ? `${navigation.indexOf(item) * 50}ms` : '0ms'
                }}
              >
                <div className="flex items-center">
                  <item.icon className="h-4 w-4 mr-3" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
