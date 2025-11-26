"use client";

import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
    const { user, userData, logout, loading } = useAuth();
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navItems = [
        { name: "Home", path: "/" },
        { name: "Workshops", path: "/workshops" },
    ];

    return (
        <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-6xl bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[0_8px_40px_rgba(56,189,248,0.15)] px-6 py-3 transition-all hover:shadow-[0_0_60px_rgba(99,102,241,0.25)]">
            <nav className="flex justify-between items-center">
                <Link
                    href="/"
                    className="text-2xl font-extrabold bg-gradient-to-r from-sky-400 via-blue-300 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]"
                >
                    VibeConnect
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex gap-8 text-sm font-medium items-center">
                    {navItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.path}
                            className={`relative group transition font-medium ${pathname === item.path ? "text-white" : "text-gray-300 hover:text-white"
                                }`}
                        >
                            {item.name}
                            <span
                                className={`absolute left-0 -bottom-[3px] h-[2px] bg-gradient-to-r from-sky-400 to-indigo-400 rounded-full transition-all duration-500 ${pathname === item.path ? "w-full" : "w-0 group-hover:w-full"
                                    }`}
                            ></span>
                        </Link>
                    ))}

                    {loading ? (
                        <div className="w-20 h-8 bg-white/5 rounded-full animate-pulse"></div>
                    ) : user ? (
                        <div className="relative group">
                            <button className="flex items-center gap-2 text-gray-300 hover:text-white transition">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-sky-400 to-indigo-400 p-[2px]">
                                    <div className="w-full h-full rounded-full bg-[#050814] flex items-center justify-center overflow-hidden">
                                        {userData?.photoURL ? (
                                            <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-bold text-white">
                                                {userData?.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span>{userData?.displayName || user.email?.split('@')[0] || "User"}</span>
                            </button>

                            {/* Dropdown */}
                            <div className="absolute right-0 mt-2 w-48 bg-[#0a0f1f] border border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-right">
                                <div className="py-2">
                                    <Link href="/profile" className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white">
                                        Profile
                                    </Link>
                                    {userData?.role === "vendor" && (
                                        <Link href="/vendor" className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white">
                                            Vendor Dashboard
                                        </Link>
                                    )}
                                    <button
                                        onClick={logout}
                                        className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 hover:text-red-300"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm font-semibold transition-all"
                        >
                            Login
                        </Link>
                    )}
                </div>

                {/* Mobile Menu Toggle (Simplified for now) */}
                <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <i className={`fa-solid ${isMenuOpen ? "fa-times" : "fa-bars"}`}></i>
                </button>
            </nav>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden mt-4 overflow-hidden"
                    >
                        <div className="flex flex-col gap-4 text-center pb-4 border-t border-white/10 pt-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.path}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="text-gray-300 hover:text-white transition"
                                >
                                    {item.name}
                                </Link>
                            ))}
                            {user ? (
                                <>
                                    <Link href="/profile" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-white transition">Profile</Link>
                                    {userData?.role === "vendor" && (
                                        <Link href="/vendor" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-white transition">Vendor Dashboard</Link>
                                    )}
                                    <button onClick={() => { logout(); setIsMenuOpen(false); }} className="text-red-400 hover:text-red-300 transition">Logout</button>
                                </>
                            ) : (
                                <Link href="/login" onClick={() => setIsMenuOpen(false)} className="text-white font-semibold">Login</Link>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
