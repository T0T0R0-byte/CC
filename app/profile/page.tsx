"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/firebase/firebaseConfig";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Workshop {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    imageUrl: string;
    date: string;
    location: string;
    ageGroup: string;
    rating?: number;
    vendorId: string;
}

interface RegisteredWorkshop extends Workshop {
    vendorName: string;
    vendorPhone: string;
    rating?: number;
    ratingCount?: number;
    status?: string;
}

export default function ProfilePage() {
    const { user, userData, loading } = useAuth();
    const router = useRouter();

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [socialLink, setSocialLink] = useState("");
    const [businessIdUrl, setBusinessIdUrl] = useState("");
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [favorites, setFavorites] = useState<Workshop[]>([]);
    const [registeredWorkshops, setRegisteredWorkshops] = useState<RegisteredWorkshop[]>([]);

    // Review Modal State
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedWorkshopForReview, setSelectedWorkshopForReview] = useState<RegisteredWorkshop | null>(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");

    // Filters
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [location, setLocation] = useState("All");
    const [priceRange, setPriceRange] = useState("All");

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        } else if (userData) {
            setName(userData.displayName || "");
            setPhone(userData.phoneNumber || "");
            setSocialLink(userData.socialLink || "");
            setBusinessIdUrl(userData.businessIdUrl || "");
            setPhotoPreview(userData.photoURL || "");

            if (userData.role !== 'vendor') {
                fetchFavorites();
                fetchRegisteredWorkshops();
            }
        }
    }, [user, userData, loading, router]);

    const fetchFavorites = async () => {
        if (!userData?.favorites || userData.favorites.length === 0) return;

        const favs: Workshop[] = [];
        for (const favId of userData.favorites) {
            const docSnap = await getDoc(doc(db, "workshops", favId));
            if (docSnap.exists()) {
                favs.push({ id: docSnap.id, ...docSnap.data() } as Workshop);
            }
        }
        setFavorites(favs);
    };

    const fetchRegisteredWorkshops = async () => {
        if (!userData?.registeredWorkshops || userData.registeredWorkshops.length === 0) return;

        const registered: RegisteredWorkshop[] = [];
        for (const wsId of userData.registeredWorkshops) {
            const wsDoc = await getDoc(doc(db, "workshops", wsId));
            if (wsDoc.exists()) {
                const wsData = wsDoc.data() as Workshop;

                // Fetch Vendor Details
                let vendorName = "Unknown Vendor";
                let vendorPhone = "Not Available";

                if (wsData.vendorId) {
                    const vendorDoc = await getDoc(doc(db, "users", wsData.vendorId));
                    if (vendorDoc.exists()) {
                        const vData = vendorDoc.data();
                        vendorName = vData.displayName || "Unknown Vendor";
                        vendorPhone = vData.phoneNumber || "Not Available";
                    }
                }

                // Fetch Registration Status
                let status = "pending";
                try {
                    const q = query(
                        collection(db, "registrations"),
                        where("workshopId", "==", wsId),
                        where("userId", "==", user?.uid)
                    );
                    const regSnap = await getDocs(q);
                    if (!regSnap.empty) {
                        status = regSnap.docs[0].data().status || "pending";
                    }
                } catch (err) {
                    console.error("Error fetching registration status:", err);
                }

                registered.push({
                    ...wsData,
                    id: wsDoc.id,
                    vendorName,
                    vendorPhone,
                    status
                });
            }
        }
        setRegisteredWorkshops(registered);
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);

        try {
            let photoURL = userData?.photoURL || "";

            if (photo) {
                const storageRef = ref(storage, `profile_photos/${user.uid}`);
                await uploadBytes(storageRef, photo);
                photoURL = await getDownloadURL(storageRef);
            }

            // Update Auth Profile
            await updateProfile(user, {
                displayName: name,
                photoURL: photoURL,
            });

            // Update Firestore
            await updateDoc(doc(db, "users", user.uid), {
                displayName: name,
                phoneNumber: phone,
                photoURL: photoURL,
                ...(userData?.role === 'vendor' && { socialLink })
            });

            setIsEditing(false);
            window.location.reload();
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setPhoto(e.target.files[0]);
            setPhotoPreview(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleRefund = (vendorPhone: string) => {
        alert(`To request a refund, please contact the vendor at: ${vendorPhone}`);
    };

    const openReviewModal = (ws: RegisteredWorkshop) => {
        setSelectedWorkshopForReview(ws);
        setReviewRating(5);
        setReviewComment("");
        setReviewModalOpen(true);
    };

    const handleSubmitReview = async () => {
        if (!selectedWorkshopForReview || !user) return;

        try {
            // 1. Add Review to 'reviews' collection
            await addDoc(collection(db, "reviews"), {
                workshopId: selectedWorkshopForReview.id,
                userId: user.uid,
                userName: userData?.displayName || "Anonymous",
                rating: reviewRating,
                comment: reviewComment,
                createdAt: new Date().toISOString() // Use ISO string for easier sorting/display
            });

            // 2. Update Workshop Average Rating
            const newRatingCount = (selectedWorkshopForReview.ratingCount || 0) + 1;
            const currentTotal = (selectedWorkshopForReview.rating || 0) * (selectedWorkshopForReview.ratingCount || 0);
            const newRating = (currentTotal + reviewRating) / newRatingCount;

            await updateDoc(doc(db, "workshops", selectedWorkshopForReview.id), {
                rating: newRating,
                ratingCount: newRatingCount
            });

            alert("Thank you for your review!");
            setReviewModalOpen(false);
            fetchRegisteredWorkshops(); // Refresh list
        } catch (error) {
            console.error("Error submitting review:", error);
            alert("Failed to submit review.");
        }
    };

    // Filter Logic
    const filteredFavorites = favorites.filter((w) => {
        const matchesSearch = w.title.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = category === "All" || w.category === category;
        const matchesLocation = location === "All" || w.location === location;

        const price = Number(w.price);
        let matchesPrice = true;
        if (priceRange === "0-2500") matchesPrice = price <= 2500;
        if (priceRange === "2500-5000") matchesPrice = price > 2500 && price <= 5000;
        if (priceRange === "5000-10000") matchesPrice = price > 5000 && price <= 10000;
        if (priceRange === "10000+") matchesPrice = price > 10000;

        return matchesSearch && matchesCategory && matchesLocation && matchesPrice;
    });

    if (loading) return <div className="min-h-screen pt-32 text-center text-white">Loading...</div>;

    return (
        <div className="min-h-screen pt-32 px-6 pb-20">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_0_40px_rgba(56,189,248,0.15)] mb-12"
                >
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        {/* Profile Image */}
                        <div className="flex-shrink-0">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 relative group">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center text-4xl font-bold text-white">
                                        {name.charAt(0).toUpperCase()}
                                    </div>
                                )}

                                {isEditing && (
                                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                                        <span className="text-white text-xs">Change</span>
                                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Profile Details */}
                        <div className="flex-grow w-full">
                            <div className="flex justify-between items-center mb-6">
                                <h1 className="text-3xl font-bold text-white">
                                    {userData?.role === 'vendor' ? 'Vendor Profile' : 'My Profile'}
                                </h1>
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold transition"
                                    >
                                        Edit Profile
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="px-4 py-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-xl text-sm font-semibold transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="px-4 py-2 bg-green-500/20 text-green-300 hover:bg-green-500/30 rounded-xl text-sm font-semibold transition"
                                        >
                                            {saving ? "Saving..." : "Save Changes"}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Full Name</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-white"
                                        />
                                    ) : (
                                        <p className="text-xl text-white">{name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Email</label>
                                    <p className="text-xl text-gray-300">{user?.email}</p>
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Phone Number</label>
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-white"
                                        />
                                    ) : (
                                        <p className="text-xl text-white">{phone || "Not set"}</p>
                                    )}
                                </div>

                                {userData?.role === 'vendor' && (
                                    <>
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-1">Social Media</label>
                                            {isEditing ? (
                                                <input
                                                    type="url"
                                                    value={socialLink}
                                                    onChange={(e) => setSocialLink(e.target.value)}
                                                    className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-white"
                                                />
                                            ) : (
                                                <a href={socialLink} target="_blank" rel="noopener noreferrer" className="text-xl text-sky-400 hover:underline truncate block">
                                                    {socialLink || "Not set"}
                                                </a>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-1">Business ID</label>
                                            {businessIdUrl ? (
                                                <a href={businessIdUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl text-sm hover:bg-white/20 transition">
                                                    <i className="fa-solid fa-file-pdf text-red-400"></i> View Document
                                                </a>
                                            ) : (
                                                <p className="text-gray-500">Not uploaded</p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Registered Workshops Section (Users Only) */}
                {userData?.role !== 'vendor' && (
                    <div className="mb-16">
                        <h2 className="text-3xl font-bold text-white mb-6">My Registrations</h2>

                        {registeredWorkshops.length > 0 ? (
                            <div className="overflow-x-auto bg-white/5 border border-white/10 rounded-2xl">
                                <table className="w-full text-left text-gray-300">
                                    <thead className="bg-white/5 text-gray-400 uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-4">Workshop</th>
                                            <th className="px-6 py-4">Vendor</th>
                                            <th className="px-6 py-4">Price</th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {registeredWorkshops.map((ws) => (
                                            <tr key={ws.id} className="hover:bg-white/5 transition">
                                                <td className="px-6 py-4 font-medium text-white">{ws.title}</td>
                                                <td className="px-6 py-4">{ws.vendorName}</td>
                                                <td className="px-6 py-4 text-sky-300">Rs. {ws.price.toLocaleString()}</td>
                                                <td className="px-6 py-4">{new Date(ws.date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${ws.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                                        ws.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-yellow-500/20 text-yellow-400'
                                                        }`}>
                                                        {ws.status ? ws.status.toUpperCase() : "PENDING"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => openReviewModal(ws)}
                                                        className="px-4 py-2 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-lg text-sm font-semibold transition flex items-center gap-2"
                                                    >
                                                        <i className="fa-solid fa-star"></i> Rate & Review
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-white/5 rounded-2xl border border-white/10 text-gray-400">
                                You haven't registered for any workshops yet.
                            </div>
                        )}
                    </div>
                )}

                {/* Favorites Section (Users Only) */}
                {userData?.role !== 'vendor' && (
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-8">My Favorites</h2>

                        {/* Filter Bar */}
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl mb-8 flex flex-wrap gap-4">
                            <input
                                type="text"
                                placeholder="Search favorites..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="px-4 py-2 bg-white/10 border border-white/10 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-white placeholder-gray-400 flex-grow"
                            />

                            <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-4 py-2 bg-white/10 border border-white/10 rounded-xl text-white">
                                <option value="All">Category</option>
                                <option value="Art">Art</option>
                                <option value="Music">Music</option>
                                <option value="Technology">Technology</option>
                                <option value="Cooking">Cooking</option>
                                <option value="Sports">Sports</option>
                            </select>

                            <select value={location} onChange={(e) => setLocation(e.target.value)} className="px-4 py-2 bg-white/10 border border-white/10 rounded-xl text-white">
                                <option value="All">Location</option>
                                {[...new Set(favorites.map((w) => w.location))].map((loc) => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>

                            <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)} className="px-4 py-2 bg-white/10 border border-white/10 rounded-xl text-white">
                                <option value="All">Price</option>
                                <option value="0-2500">0 - 2,500</option>
                                <option value="2500-5000">2,500 - 5,000</option>
                                <option value="5000-10000">5,000 - 10,000</option>
                                <option value="10000+">10,000+</option>
                            </select>
                        </div>

                        {filteredFavorites.length > 0 ? (
                            <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                <AnimatePresence>
                                    {filteredFavorites.map((w) => (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            key={w.id}
                                            className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition group"
                                        >
                                            <div className="relative h-40 mb-4 overflow-hidden rounded-xl">
                                                {w.imageUrl ? (
                                                    <img src={w.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                                                ) : (
                                                    <div className="w-full h-full bg-white/10 flex items-center justify-center">
                                                        <i className="fa-solid fa-image text-gray-500"></i>
                                                    </div>
                                                )}
                                                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg text-xs text-white">
                                                    {w.category}
                                                </div>
                                            </div>

                                            <h3 className="text-lg font-semibold text-sky-300 mb-1 truncate">{w.title}</h3>
                                            <div className="flex justify-between text-sm text-gray-400 mb-3">
                                                <span>{new Date(w.date).toLocaleDateString()}</span>
                                                <span>{w.location}</span>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-white font-bold">Rs. {w.price.toLocaleString()}</span>
                                                <Link href={`/register/${w.id}`} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-white transition">
                                                    View
                                                </Link>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        ) : (
                            <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/10">
                                <i className="fa-regular fa-heart text-4xl text-gray-600 mb-4"></i>
                                <p className="text-gray-400">No favorites found matching your filters.</p>
                            </div>
                        )}
                    </div>
                )}
                {/* Review Modal */}
                <AnimatePresence>
                    {reviewModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-[#0f172a] border border-white/20 p-8 rounded-3xl w-full max-w-md shadow-2xl"
                            >
                                <h3 className="text-2xl font-bold text-white mb-6 text-center">Rate & Review</h3>

                                <div className="flex justify-center gap-2 mb-6">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setReviewRating(star)}
                                            className="text-3xl transition hover:scale-110 focus:outline-none"
                                        >
                                            <i className={`${star <= reviewRating ? "fa-solid text-yellow-400" : "fa-regular text-gray-600"} fa-star`}></i>
                                        </button>
                                    ))}
                                </div>

                                <div className="mb-6">
                                    <label className="block text-gray-400 text-sm mb-2">Your Review</label>
                                    <textarea
                                        value={reviewComment}
                                        onChange={(e) => setReviewComment(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 outline-none transition h-32 resize-none"
                                        placeholder="Share your experience..."
                                    ></textarea>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setReviewModalOpen(false)}
                                        className="flex-1 py-3 text-gray-400 hover:text-white transition font-semibold bg-white/5 rounded-xl hover:bg-white/10"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmitReview}
                                        className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:shadow-[0_0_30px_rgba(56,189,248,0.6)] hover:scale-105 transition"
                                    >
                                        Submit Review
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
