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
  name: string;
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
  const [vendorFilter, setVendorFilter] = useState("All");

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
        acc[doc.id] = doc.data() as Vendor;
        return acc;
      }, {} as Record<string, Vendor>);

      setVendors(vendorList);
      setLoading(false);
    };

    fetchData();
  }, []);

  const toggleFavorite = async (workshopId: string) => {
    if (!user || !userData) {
      alert("Please login to add to favorites.");
      return;
    }

    const isFav = userData.favorites?.includes(workshopId);
    const userRef = doc(db, "users", user.uid);

    try {
      if (isFav) {
        await updateDoc(userRef, {
          favorites: arrayRemove(workshopId),
        });
        // Optimistic update (or wait for context refresh, but context refresh might be slow)
        // For now, we rely on page reload or context update. 
        // To make it instant, we'd need to update local state or force context refresh.
        // Since userData comes from context, we can't mutate it directly.
        // We'll just alert or show toast.
      } else {
        await updateDoc(userRef, {
          favorites: arrayUnion(workshopId),
        });
      }
      // Trigger a reload of user data if possible, or just reload page for now to reflect changes
      window.location.reload();
    } catch (error) {
      console.error("Error toggling favorite:", error);
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
    const matchesVendor = vendorFilter === "All" || w.vendorId === vendorFilter;
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
      matchesVendor &&
      matchesLocation &&
      matchesAge &&
      matchesPrice &&
      matchesRating
    );
  });

  return (
    <main className="min-h-screen px-6 py-28 text-gray-100">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-6xl font-extrabold mb-12 bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent"
      >
        Explore Workshops
      </motion.h1>

      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl mb-16 shadow-[0_0_25px_rgba(56,189,248,0.15)] flex flex-wrap justify-center gap-4">
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
        </select>

        <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="px-4 py-3 bg-white/10 border border-white/10 rounded-xl">
          <option value="All">Vendor</option>
          {Object.entries(vendors).map(([id, vendor]) => (
            <option key={id} value={id}>
              {vendor.name}
            </option>
          ))}
        </select>

        <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="px-4 py-3 bg-white/10 border border-white/10 rounded-xl">
          <option value="All">Age Group</option>
          <option value="Kids">Kids</option>
          <option value="Teans">Teens</option>
          <option value="Adults">Adults</option>
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
        <p className="text-center text-gray-400">Loading workshops...</p>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-12">
          <AnimatePresence>
            {filtered.map((w, i) => {
              const isRegistered = userData?.registeredWorkshops?.includes(w.id);
              const isFavorite = userData?.favorites?.includes(w.id);
              const userRating = w.ratings?.[user?.uid || ""] || 0;

              return (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(56,189,248,0.25)] transition-all"
                >
                  {/* Favorite Button */}
                  <button
                    onClick={() => toggleFavorite(w.id)}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 hover:bg-black/60 transition"
                  >
                    <i className={`fa-${isFavorite ? "solid" : "regular"} fa-heart text-red-500`}></i>
                  </button>

                  <img src={w.imageUrl} className="w-full h-56 object-cover rounded-2xl mb-5 group-hover:scale-110 transition-all duration-700" />

                  <h3 className="text-2xl font-semibold text-sky-300 mb-2">{w.title}</h3>

                  <p className="text-indigo-300 text-sm mb-2 italic">
                    By {vendors[w.vendorId]?.name || "Unknown Vendor"}
                  </p>

                  <p className="text-gray-400 text-sm mb-4 line-clamp-3">{w.description}</p>

                  <div className="flex justify-between text-gray-300 text-sm mb-4">
                    <span>{new Date(w.date).toLocaleDateString()}</span>
                    <span>{w.location}</span>
                  </div>

                  <div className="flex justify-between text-gray-300 text-sm mb-4">
                    <span>Price: Rs. {Number(w.price).toLocaleString("en-LK")}</span>
                    <span>Age: {w.ageGroup}</span>
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
                    <div className="mt-4">
                      <p className="text-center text-sm text-gray-300 mb-2">Rate this workshop:</p>
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleRate(w.id, star)}
                            className={`text-2xl transition ${star <= userRating ? "text-yellow-400" : "text-gray-600 hover:text-yellow-200"}`}
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
                      className="block mt-4 py-2 text-center bg-gradient-to-r from-sky-500 to-indigo-500 rounded-xl font-semibold hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] transition"
                    >
                      Register
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-center text-gray-400 mt-10">No workshops found.</p>
      )}
    </main>
  );
}

export default dynamic(() => Promise.resolve(WorkshopsPage), { ssr: false });
