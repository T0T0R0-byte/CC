"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/firebase/firebaseConfig";
import { collection, getDocs, query, where, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";

interface Workshop {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  imageBase64?: string;
  date: string;
  vendorId: string;
  location: string;
  ageGroup: string;
  rating?: number;
  ratingCount?: number;
  ratings?: Record<string, number>; // Map of userId -> rating
}

interface Vendor {
  id: string;
  displayName: string;
  businessName?: string;
}

function WorkshopsPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [vendors, setVendors] = useState<Record<string, Vendor>>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("All");
  const [priceRange, setPriceRange] = useState("All");
  const [ageGroup, setAgeGroup] = useState("All");
  const [ratingFilter, setRatingFilter] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      const workshopSnap = await getDocs(collection(db, "workshops"));
      const workshopList = workshopSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Workshop[];

      setWorkshops(workshopList);

      const vendorQuery = query(
        collection(db, "users"),
        where("role", "==", "vendor")
      );
      const vendorSnap = await getDocs(vendorQuery);

      const vendorList = vendorSnap.docs.reduce((acc, doc) => {
        const data = doc.data();
        acc[doc.id] = {
          id: doc.id,
          displayName: data.displayName,
          businessName: data.businessName,
        };
        return acc;
      }, {} as Record<string, Vendor>);

      setVendors(vendorList);
      setLoading(false);
    };

    fetchData();
  }, []);

  const [localFavorites, setLocalFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (userData?.favorites) {
      setLocalFavorites(userData.favorites);
    }
  }, [userData]);

  // ... (fetchData effect remains same)

  const toggleFavorite = async (workshopId: string) => {
    if (!user) {
      alert("Please login to add to favorites.");
      return;
    }

    const isFav = localFavorites.includes(workshopId);

    // Optimistic Update
    setLocalFavorites(prev => isFav ? prev.filter(id => id !== workshopId) : [...prev, workshopId]);

    const userRef = doc(db, "users", user.uid);

    try {
      if (isFav) {
        await updateDoc(userRef, {
          favorites: arrayRemove(workshopId),
        });
      } else {
        await updateDoc(userRef, {
          favorites: arrayUnion(workshopId),
        });
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      // Revert on error
      setLocalFavorites(prev => isFav ? [...prev, workshopId] : prev.filter(id => id !== workshopId));
    }
  };

  const handleRegisterClick = (e: React.MouseEvent, workshopId: string) => {
    if (!user) {
      e.preventDefault();
      alert("Register or login to register for a workshop");
      // Optionally redirect to login
      // router.push("/login"); 
    }
  };

  const handleRate = async (workshopId: string, rating: number) => {
    if (!user) return;

    // Update workshop rating
    // We need to store individual ratings to calculate average correctly.
    // Assuming 'ratings' field is a map { userId: rating }

    try {
      const workshopRef = doc(db, "workshops", workshopId);
      const workshop = workshops.find(w => w.id === workshopId);
      if (!workshop) return;

      const currentRatings = workshop.ratings || {};
      currentRatings[user.uid] = rating;

      const values = Object.values(currentRatings);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;

      await updateDoc(workshopRef, {
        ratings: currentRatings,
        rating: avg,
        ratingCount: values.length
      });

      // Update local state
      setWorkshops(prev => prev.map(w => w.id === workshopId ? { ...w, ratings: currentRatings, rating: avg, ratingCount: values.length } : w));

    } catch (error) {
      console.error("Error rating workshop:", error);
    }
  };

  const filtered = workshops.filter((w) => {
    const matchesSearch = w.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || w.category === category;
    // const matchesVendor = vendorFilter === "All" || w.vendorId === vendorFilter; // Removed
    const matchesLocation = location === "All" || w.location === location;
    const matchesAge = ageGroup === "All" || w.ageGroup === ageGroup;

    const price = Number(w.price);
    let matchesPrice = true;

    if (priceRange === "0-2500") matchesPrice = price <= 2500;
    if (priceRange === "2500-5000") matchesPrice = price > 2500 && price <= 5000;
    if (priceRange === "5000-10000") matchesPrice = price > 5000 && price <= 10000;
    if (priceRange === "10000-20000") matchesPrice = price > 10000 && price <= 20000;
    if (priceRange === "20000-30000") matchesPrice = price > 20000 && price <= 30000;
    if (priceRange === "30000+") matchesPrice = price > 30000;

    const matchesRating =
      ratingFilter === "All" || (w.rating || 0) >= Number(ratingFilter);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesSearch &&
      matchesCategory &&
      // matchesVendor && // Removed
      matchesLocation &&
      matchesLocation &&
      matchesAge &&
      matchesPrice &&
      matchesRating
    );
  });

  return (
    <main className="min-h-screen px-6 py-28 text-gray-100">
      {/* ... (Header and Filters remain same) */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-6xl font-extrabold mb-12 bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent"
      >
        Explore Workshops
      </motion.h1>

      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl mb-16 shadow-[0_0_25px_rgba(56,189,248,0.15)] flex flex-wrap justify-center gap-4">
        {/* ... (Inputs and Selects remain same - I will just copy them to be safe or use ... if I can but I must replace the whole block if I use replace_file_content) */}
        <input
          type="text"
          placeholder="Search workshops..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-3 w-64 bg-white/10 border border-white/10 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
        />

        <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-4 py-3 bg-white/10 border border-white/10 rounded-xl">
          <option value="All">Category</option>
          <option value="Art">Art</option>
          <option value="Music">Music</option>
          <option value="Technology">Technology</option>
          <option value="Cooking">Cooking</option>
          <option value="Sports">Sports</option>
          <option value="Business">Business</option>
          <option value="Health">Health</option>
          <option value="Other">Other</option>
        </select>

        {/* Removed Vendor Select */}

        <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="px-4 py-3 bg-white/10 border border-white/10 rounded-xl">
          <option value="All">Age Group</option>
          <option value="All Ages">All Ages</option>
          <option value="Kids (5-12)">Kids (5-12)</option>
          <option value="Teens (13-18)">Teens (13-18)</option>
          <option value="Adults (18+)">Adults (18+)</option>
        </select>

        <select value={location} onChange={(e) => setLocation(e.target.value)} className="px-4 py-3 bg-white/10 border border-white/10 rounded-xl">
          <option value="All">Location</option>
          {[...new Set(workshops.map((w) => w.location))].map((loc) => (
            <option key={loc}>{loc}</option>
          ))}
        </select>

        <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)} className="px-4 py-3 bg-white/10 border border-white/10 rounded-xl">
          <option value="All">Price (Rs.)</option>
          <option value="0-2500">Rs. 0 – 2,500</option>
          <option value="2500-5000">Rs. 2,500 – 5,000</option>
          <option value="5000-10000">Rs. 5,000 – 10,000</option>
          <option value="10000-20000">Rs. 10,000 – 20,000</option>
          <option value="20000-30000">Rs. 20,000 – 30,000</option>
          <option value="30000+">Rs. 30,000+</option>
        </select>

        <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className="px-4 py-3 bg-white/10 border border-white/10 rounded-xl">
          <option value="All">Min Rating</option>
          <option value="1">⭐ 1+</option>
          <option value="2">⭐ 2+</option>
          <option value="3">⭐ 3+</option>
          <option value="4">⭐ 4+</option>
          <option value="5">⭐ 5</option>
        </select>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-12">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white/5 border border-white/10 rounded-3xl p-6 h-[500px] animate-pulse">
              <div className="w-full h-56 bg-white/10 rounded-2xl mb-5"></div>
              <div className="h-8 bg-white/10 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-white/10 rounded w-1/2 mb-4"></div>
              <div className="h-20 bg-white/10 rounded w-full mb-4"></div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-12">
          <AnimatePresence>
            {filtered.map((w, i) => {
              const isRegistered = userData?.registeredWorkshops?.includes(w.id);
              const isFavorite = localFavorites.includes(w.id);
              const userRating = w.ratings?.[user?.uid || ""] || 0;

              return (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(56,189,248,0.25)] transition-all flex flex-col"
                >
                  {/* Favorite Button */}
                  <button
                    onClick={() => toggleFavorite(w.id)}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 hover:bg-black/60 transition hover:scale-110"
                  >
                    <i className={`fa-${isFavorite ? "solid" : "regular"} fa-heart text-red-500 text-xl transition-all ${isFavorite ? "scale-110" : ""}`}></i>
                  </button>

                  {w.imageBase64 || w.imageUrl ? (
                    <img src={w.imageBase64 || w.imageUrl} className="w-full h-56 object-cover rounded-2xl mb-5 group-hover:scale-105 transition-all duration-700" />
                  ) : (
                    <div className="w-full h-56 bg-white/5 rounded-2xl mb-5 flex items-center justify-center border border-white/10">
                      <i className="fa-solid fa-image text-4xl text-gray-500"></i>
                    </div>
                  )}

                  <h3 className="text-2xl font-semibold text-sky-300 mb-2">{w.title}</h3>

                  <p className="text-indigo-300 text-sm mb-2 italic">
                    By {vendors[w.vendorId]?.businessName || vendors[w.vendorId]?.displayName || "Unknown Vendor"}
                  </p>

                  <p className="text-gray-400 text-sm mb-4 line-clamp-3 flex-grow">{w.description}</p>

                  <div className="flex justify-between text-gray-300 text-sm mb-4">
                    <span className="flex items-center gap-2"><i className="fa-regular fa-calendar"></i> {new Date(w.date).toLocaleDateString()}</span>
                    <span className="flex items-center gap-2"><i className="fa-solid fa-location-dot"></i> {w.location}</span>
                  </div>

                  <div className="flex justify-between text-gray-300 text-sm mb-4">
                    <span className="font-bold text-white">Rs. {Number(w.price).toLocaleString("en-LK")}</span>
                    <span className="px-2 py-0.5 bg-white/10 rounded text-xs">{w.ageGroup}</span>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1 text-yellow-400 text-lg">
                      {"⭐".repeat(Math.round(w.rating || 0))}
                      <span className="text-gray-400 text-sm ml-2">({w.rating ? w.rating.toFixed(1) : 0})</span>
                    </div>
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border border-green-500/30">
                      Open
                    </span>
                  </div>

                  {isRegistered ? (
                    <div className="mt-auto pt-4 border-t border-white/10">
                      <p className="text-center text-sm text-gray-300 mb-2">Rate this workshop:</p>
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleRate(w.id, star)}
                            className={`text-2xl transition hover:scale-110 ${star <= userRating ? "text-yellow-400" : "text-gray-600 hover:text-yellow-200"}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={`/register/${w.id}`}
                      onClick={(e) => handleRegisterClick(e, w.id)}
                      className="block mt-auto py-3 text-center bg-gradient-to-r from-sky-500 to-indigo-500 rounded-xl font-bold text-white hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:scale-[1.02] transition"
                    >
                      Register Now
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
          <i className="fa-solid fa-magnifying-glass text-6xl text-gray-600 mb-6"></i>
          <h3 className="text-2xl font-bold text-white mb-2">No workshops found</h3>
          <p className="text-gray-400">Try adjusting your filters or search query.</p>
          <button
            onClick={() => { setSearch(""); setCategory("All"); setLocation("All"); setPriceRange("All"); setAgeGroup("All"); setRatingFilter("All"); }}
            className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition"
          >
            Clear Filters
          </button>
        </div>
      )}
    </main>
  );
}

export default dynamic(() => Promise.resolve(WorkshopsPage), { ssr: false });
