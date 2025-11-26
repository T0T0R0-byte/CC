"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import { useAuth } from "@/app/context/AuthContext";
import { registerForWorkshop } from "@/firebase/workshopActions";
import { motion, AnimatePresence } from "framer-motion";

interface Workshop {
    id: string;
    title: string;
    description: string;
    price: number;
    date: string;
    imageUrl: string;
    location: string;
    whatsappLink?: string;
    category: string;
    rating?: number;
    ratingCount?: number;
    vendorId: string;
    vendorPhone?: string;
}

export default function RegisterWorkshopPage() {
    const { id } = useParams();
    const { user, userData, loading: authLoading } = useAuth();
    const router = useRouter();
    const [workshop, setWorkshop] = useState<Workshop | null>(null);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Form State
    const [receipt, setReceipt] = useState<File | null>(null);
    const [consent, setConsent] = useState(false);
    const [fullName, setFullName] = useState("");
    const [age, setAge] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
            return;
        }

        const fetchWorkshop = async () => {
            if (typeof id !== "string") return;
            const docRef = doc(db, "workshops", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                let vendorPhone = "";

                if (data.vendorId) {
                    const vendorSnap = await getDoc(doc(db, "users", data.vendorId));
                    if (vendorSnap.exists()) {
                        vendorPhone = vendorSnap.data().phoneNumber || "";
                    }
                }

                setWorkshop({ id: docSnap.id, ...data, vendorPhone } as Workshop);
            }
            setLoading(false);
        };

        fetchWorkshop();
    }, [id, user, authLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !workshop) return;

        if (userData?.role === 'vendor') {
            alert("Vendors cannot register for workshops.");
            return;
        }

        // Receipt is now optional for testing
        // if (!receipt) {
        //     alert("Please upload the payment receipt.");
        //     return;
        // }

        if (receipt && receipt.size > 5 * 1024 * 1024) {
            alert("Receipt file must be less than 5MB.");
            return;
        }
        if (!consent) {
            alert("You must agree to the terms and conditions.");
            return;
        }

        setRegistering(true);

        try {
            await registerForWorkshop(workshop.id, user.uid, receipt, {
                fullName,
                age,
                phone,
                address
            });
            setIsSuccess(true);
        } catch (error) {
            console.error("Registration failed:", error);
            alert("Registration failed. Please try again.");
        } finally {
            setRegistering(false);
        }
    };

    if (loading || authLoading) return <div className="min-h-screen pt-32 text-center text-white">Loading...</div>;
    if (!workshop) return <div className="min-h-screen pt-32 text-center text-white">Workshop not found.</div>;

    return (
        <div className="min-h-screen pt-32 px-6 pb-20 bg-[#050814]">
            <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-12">

                {/* LEFT: Workshop Details (2/3 width) */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-2 space-y-10"
                >
                    {/* Header Section */}
                    <div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
                            {workshop.title}
                        </h1>
                        <div className="flex items-center gap-4 text-gray-400 text-sm mb-6">
                            <span className="bg-white/10 px-3 py-1 rounded-full text-white">{workshop.category}</span>
                            <span className="flex items-center gap-1 text-yellow-400">
                                <i className="fa-solid fa-star"></i> {workshop.rating ? workshop.rating.toFixed(1) : "New"}
                                <span className="text-gray-500">({workshop.ratingCount || 0} reviews)</span>
                            </span>
                            <span><i className="fa-solid fa-location-dot mr-1"></i> {workshop.location || "Online"}</span>
                        </div>

                        <img
                            src={workshop.imageUrl}
                            alt={workshop.title}
                            className="w-full h-[400px] object-cover rounded-3xl shadow-[0_0_40px_rgba(56,189,248,0.15)] border border-white/10"
                        />
                    </div>

                    {/* About Section */}
                    <div className="bg-white/5 border border-white/10 p-8 rounded-3xl">
                        <h3 className="text-2xl font-bold text-white mb-4">About This Workshop</h3>
                        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-lg">
                            {workshop.description}
                        </p>
                    </div>

                    {/* What you'll learn (Mock Data) */}
                    <div className="bg-white/5 border border-white/10 p-8 rounded-3xl">
                        <h3 className="text-2xl font-bold text-white mb-6">What you'll learn</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            {["Master the fundamentals", "Hands-on practical experience", "Industry best practices", "Certificate of completion", "Networking opportunities", "Direct mentorship"].map((item, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <i className="fa-solid fa-check text-green-400 mt-1"></i>
                                    <span className="text-gray-300">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Requirements (Mock Data) */}
                    <div className="bg-white/5 border border-white/10 p-8 rounded-3xl">
                        <h3 className="text-2xl font-bold text-white mb-4">Requirements</h3>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>No prior experience needed - beginners welcome!</li>
                            <li>A laptop or device to join online sessions (if applicable).</li>
                            <li>Enthusiasm and willingness to learn.</li>
                        </ul>
                    </div>

                </motion.div>

                {/* RIGHT: Sticky Sidebar (1/3 width) */}
                <div className="relative">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="sticky top-32 bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-[0_0_40px_rgba(56,189,248,0.15)]"
                    >
                        {/* Price Header */}
                        <div className="flex items-end gap-2 mb-6">
                            <span className="text-4xl font-bold text-white">Rs. {workshop.price.toLocaleString()}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-3 text-gray-300 text-sm">
                                <i className="fa-regular fa-clock text-sky-400"></i>
                                <span>Date: <strong>{new Date(workshop.date).toLocaleDateString()}</strong></span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-300 text-sm">
                                <i className="fa-solid fa-infinity text-sky-400"></i>
                                <span>Full lifetime access</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-300 text-sm">
                                <i className="fa-solid fa-mobile-screen text-sky-400"></i>
                                <span>Access on mobile and TV</span>
                            </div>
                        </div>

                        {userData?.role === 'vendor' ? (
                            <button
                                disabled
                                className="w-full py-4 bg-gray-600 rounded-xl font-bold text-gray-400 text-lg cursor-not-allowed"
                            >
                                Vendors Cannot Register
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="w-full py-4 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-xl font-bold text-white text-lg hover:shadow-[0_0_30px_rgba(56,189,248,0.4)] transition"
                            >
                                Register Now
                            </button>
                        )}

                        <p className="text-center text-[10px] text-gray-500 mt-4">
                            30-Day Money-Back Guarantee
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* REGISTRATION MODAL */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-[#0a0f1f] border border-white/20 p-8 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative"
                        >
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
                            >
                                <i className="fa-solid fa-times text-xl"></i>
                            </button>

                            {isSuccess ? (
                                <div className="text-center py-10">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/50"
                                    >
                                        <i className="fa-solid fa-check text-5xl text-green-400"></i>
                                    </motion.div>
                                    <h2 className="text-3xl font-bold text-white mb-4">Payment Done!</h2>
                                    <p className="text-gray-400 mb-8 text-lg">
                                        Your registration has been submitted successfully. <br />
                                        The vendor will review your receipt shortly.
                                    </p>

                                    {workshop.whatsappLink && (
                                        <a
                                            href={workshop.whatsappLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-full py-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl mb-4 transition flex items-center justify-center gap-2"
                                        >
                                            <i className="fa-brands fa-whatsapp text-xl"></i> Join WhatsApp Group
                                        </a>
                                    )}

                                    <div className="bg-white/5 p-4 rounded-xl mb-6">
                                        <p className="text-sm text-gray-400 mb-2">Need a refund?</p>
                                        <p className="text-white font-bold">
                                            Contact Vendor: <a href={`tel:${workshop.vendorPhone}`} className="text-sky-400 hover:underline">{workshop.vendorPhone || "Not Available"}</a>
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => router.push('/workshops')}
                                        className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition"
                                    >
                                        Explore More Workshops
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-2xl font-bold text-white mb-6">Complete Registration</h2>

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {/* Participant Details */}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Full Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    className="w-full px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 outline-none transition"
                                                    placeholder="Enter your full name"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Age</label>
                                                    <input
                                                        type="number"
                                                        required
                                                        value={age}
                                                        onChange={(e) => setAge(e.target.value)}
                                                        className="w-full px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 outline-none transition"
                                                        placeholder="Age"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Phone Number</label>
                                                    <input
                                                        type="tel"
                                                        required
                                                        value={phone}
                                                        onChange={(e) => setPhone(e.target.value)}
                                                        className="w-full px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 outline-none transition"
                                                        placeholder="07X XXXXXXX"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Address</label>
                                                <textarea
                                                    required
                                                    value={address}
                                                    onChange={(e) => setAddress(e.target.value)}
                                                    className="w-full px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 outline-none transition h-24 resize-none"
                                                    placeholder="Enter your address"
                                                />
                                            </div>
                                        </div>

                                        {/* Bank Details */}
                                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl mb-6">
                                            <h4 className="text-sky-400 font-bold mb-3 text-sm uppercase tracking-wider">
                                                Bank Transfer Details
                                            </h4>
                                            <div className="space-y-2 text-xs text-gray-300">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Bank:</span>
                                                    <span className="text-white">Commercial Bank</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Acc No:</span>
                                                    <span className="text-white font-mono">8001234567</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Branch:</span>
                                                    <span className="text-white">Colombo 07</span>
                                                </div>
                                                <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                                                    <span className="text-gray-500">Amount:</span>
                                                    <span className="text-sky-400 font-bold">Rs. {workshop.price.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between pt-2 mt-2 border-t border-white/10">
                                                    <span className="text-gray-500">Vendor Contact:</span>
                                                    <span className="text-white">{workshop.vendorPhone || "Not Available"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Upload Receipt */}
                                        <div>
                                            <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Upload Receipt (PDF Only)</label>
                                            <div className="relative border border-dashed border-white/20 rounded-xl p-6 hover:border-sky-500/50 transition bg-white/5 text-center cursor-pointer group">
                                                <input
                                                    type="file"
                                                    accept="application/pdf"
                                                    onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <div className="flex flex-col items-center gap-2">
                                                    <i className="fa-solid fa-file-pdf text-3xl text-gray-500 group-hover:text-red-400 transition"></i>
                                                    <p className="text-sm text-gray-400 group-hover:text-white transition truncate w-full px-2">
                                                        {receipt ? receipt.name : "Click to upload payment proof (PDF)"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Consent */}
                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <div className="relative flex items-center mt-0.5">
                                                <input
                                                    type="checkbox"
                                                    checked={consent}
                                                    onChange={(e) => setConsent(e.target.checked)}
                                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-white/20 bg-white/5 checked:border-sky-500 checked:bg-sky-500 transition-all"
                                                />
                                                <i className="fa-solid fa-check absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-white opacity-0 peer-checked:opacity-100 pointer-events-none"></i>
                                            </div>
                                            <span className="text-sm text-gray-400 group-hover:text-gray-300 transition select-none leading-tight">
                                                I agree to the <a href="#" className="text-sky-400 hover:underline">Terms & Conditions</a> and consent to participate.
                                            </span>
                                        </label>

                                        <button
                                            type="submit"
                                            disabled={registering}
                                            className="w-full py-4 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-xl font-bold text-white hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {registering ? "Processing..." : "Confirm & Register"}
                                        </button>
                                    </form>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
