"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/firebase/firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"user" | "vendor">("user");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Vendor Specific State
    const [phoneNumber, setPhoneNumber] = useState("");
    const [socialLink, setSocialLink] = useState("");
    const [businessIdFile, setBusinessIdFile] = useState<File | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // Validation for Vendor
            if (role === "vendor") {
                if (!phoneNumber || !socialLink || !businessIdFile) {
                    throw new Error("Please fill all vendor details and upload Business ID.");
                }
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, { displayName: name });

            let businessIdUrl = "";
            if (role === "vendor" && businessIdFile) {
                const storageRef = ref(storage, `business_ids/${user.uid}-${Date.now()}.pdf`);
                await uploadBytes(storageRef, businessIdFile);
                businessIdUrl = await getDownloadURL(storageRef);
            }

            // Create user document in Firestore
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                displayName: name,
                email: user.email,
                role: role,
                createdAt: serverTimestamp(),
                favorites: [],
                registeredWorkshops: [],
                // Vendor Fields
                ...(role === "vendor" && {
                    phoneNumber,
                    socialLink,
                    businessIdUrl,
                    isVerified: false // Vendors might need approval
                })
            });

            router.push("/");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-20">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-[0_0_40px_rgba(56,189,248,0.15)]"
            >
                <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
                    Create Account
                </h2>

                {error && <p className="text-red-400 text-center mb-4 text-sm">{error}</p>}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-white"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-white"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm mb-2">I am a:</label>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setRole("user")}
                                className={`flex-1 py-2 rounded-xl border transition ${role === "user"
                                    ? "bg-sky-500/20 border-sky-500 text-sky-300"
                                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                    }`}
                            >
                                User
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole("vendor")}
                                className={`flex-1 py-2 rounded-xl border transition ${role === "vendor"
                                    ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                    }`}
                            >
                                Vendor
                            </button>
                        </div>
                    </div>

                    {/* Vendor Specific Fields */}
                    {role === "vendor" && (
                        <div className="space-y-4 pt-2 border-t border-white/10">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                                    required
                                    placeholder="+94 77 123 4567"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Social Media Link</label>
                                <input
                                    type="url"
                                    value={socialLink}
                                    onChange={(e) => setSocialLink(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                                    required
                                    placeholder="https://instagram.com/yourbusiness"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Business ID (PDF)</label>
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => setBusinessIdFile(e.target.files?.[0] || null)}
                                    className="w-full text-gray-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-xl font-bold text-white hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] transition disabled:opacity-50"
                    >
                        {loading ? "Creating Account..." : "Register"}
                    </button>
                </form>

                <p className="text-center text-gray-400 mt-6 text-sm">
                    Already have an account?{" "}
                    <Link href="/login" className="text-sky-400 hover:text-sky-300">
                        Login
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
