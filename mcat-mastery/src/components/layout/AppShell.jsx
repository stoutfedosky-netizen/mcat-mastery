"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ShieldLogo from "../ShieldLogo";
import { useApp } from "../../context/AppContext";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" />
      </svg>
    ),
  },
  {
    href: "/practice",
    label: "Practice",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    href: "/review",
    label: "Review",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-1 7l-3 3m0 0l-3-3m3 3V8" />
      </svg>
    ),
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: "/bookmarks",
    label: "Bookmarks",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
  },
];

function NavLink({ item, active, onClick }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-[#e8eef6] text-[#1a3a5c]"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
      }`}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const { user, displayName, signOut } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const sidebar = (
    <div className="flex flex-col h-full">
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={pathname === item.href}
            onClick={() => setSidebarOpen(false)}
          />
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100 space-y-1">
        <NavLink
          item={{
            href: "/settings",
            label: "Settings",
            icon: (
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ),
          }}
          active={pathname === "/settings"}
          onClick={() => setSidebarOpen(false)}
        />
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors w-full text-left"
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Log Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f7fa] font-exam">
      {/* Top navbar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-800"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-2.5">
              <ShieldLogo className="w-8 h-9" />
              <span className="text-lg font-bold text-[#1a3a5c] tracking-tight">
                The 528 Academy
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
              aria-label="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#e8eef6] flex items-center justify-center text-xs font-bold text-[#1a3a5c]">
                  {displayName
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {displayName}
                </span>
                <svg className="w-4 h-4 text-gray-400 hidden sm:block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-100 shadow-lg py-1.5 z-50">
                  <div className="px-4 py-2.5 border-b border-gray-50">
                    <p className="text-sm font-medium text-gray-800 truncate">{displayName}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={signOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-60 bg-white border-r border-gray-100 sticky top-16 h-[calc(100vh-4rem)] flex-shrink-0">
          {sidebar}
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/30"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="relative w-64 bg-white h-full shadow-xl">
              <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100">
                <span className="text-base font-bold text-[#1a3a5c]">The 528 Academy</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  aria-label="Close menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {sidebar}
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
