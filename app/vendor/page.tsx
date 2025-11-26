"use client";

import React, { useEffect, useState } from "react";
import {
  createWorkshop,
  getVendorWorkshops,
  deleteWorkshop,
  updateWorkshop,
} from "../../firebase/workshopActions";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

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
  whatsappLink?: string;
  location?: string;
  capacity?: number;
  ageGroup?: string;
}

interface Participant {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  receiptUrl?: string;
  receiptBase64?: string;
  status?: "pending" | "approved" | "rejected";
  registrationId?: string;
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

const CATEGORIES = ["Art", "Music", "Technology", "Cooking", "Sports", "Business", "Health", "Other"];

const VendorDashboard: React.FC = () => {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [participantsMap, setParticipantsMap] = useState<Record<string, Participant[]>>({});

  // Reviews State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [category, setCategory] = useState("Art");
  const [date, setDate] = useState("");
  const [whatsappLink, setWhatsappLink] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  // New Fields
  const [location, setLocation] = useState("Online");
  const [capacity, setCapacity] = useState(0);
  const [ageGroup, setAgeGroup] = useState("All Ages");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      console.log("VendorDashboard: No user found, redirecting to login.");
      router.push("/login");
      return;
    }

    if (userData?.role !== "vendor") {
      console.log("VendorDashboard: User is not a vendor, redirecting to home.");
      router.push("/");
      return;
    }

    fetchData();
  }, [user, userData, authLoading, router]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      console.log("VendorDashboard: Fetching workshops for vendor:", user.uid);
      const data = await getVendorWorkshops(user.uid);
      setWorkshops(data as Workshop[]);
      console.log("VendorDashboard: Workshops fetched:", data.length);

      // Fetch participants via Registrations Collection
      const pMap: Record<string, Participant[]> = {};

      for (const ws of data as Workshop[]) {
        try {
          const q = query(collection(db, "registrations"), where("workshopId", "==", ws.id));
          const snap = await getDocs(q);

          const participants: Participant[] = [];

          for (const regDoc of snap.docs) {
            const regData = regDoc.data();
            // Fetch User Details
            const userSnap = await getDoc(doc(db, "users", regData.userId));
            if (userSnap.exists()) {
              const userData = userSnap.data();
              participants.push({
                uid: userData.uid,
                displayName: userData.displayName,
                email: userData.email,
                phoneNumber: userData.phoneNumber,
                receiptUrl: regData.receiptUrl,
                status: regData.status || "pending",
                registrationId: regDoc.id
              });
            }
          }
          pMap[ws.id] = participants;
        } catch (err) {
          console.error(`VendorDashboard: Error fetching participants for workshop ${ws.id}:`, err);
        }
      }
      setParticipantsMap(pMap);
    } catch (err) {
      console.error("VendorDashboard: Error fetching data:", err);
      setError("Failed to load dashboard data. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice(0);
    setCategory("Art");
    setDate("");
    setWhatsappLink("");
    setImage(null);
    setImagePreview("");
    setLocation("Online");
    setCapacity(0);
    setAgeGroup("All Ages");
    setSelectedWorkshop(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async () => {
    if (!user || !title || !description || !category || !date) {
      alert("Please fill all required fields.");
      return;
    }

    try {
      await createWorkshop(user.uid, {
        title,
        description,
        price,
        category,
        date,
        whatsappLink,
        image,
        location,
        capacity,
        ageGroup
      });

      resetForm();
      setIsCreateOpen(false);
      await fetchData();
    } catch (err) {
      console.error("VendorDashboard: Error creating workshop:", err);
      alert("Failed to create workshop.");
    }
  };

  const handleEdit = async () => {
    if (!selectedWorkshop) return;

    try {
      console.log("VendorDashboard: Updating workshop:", selectedWorkshop.id);
      await updateWorkshop(selectedWorkshop.id, {
        title,
        description,
        price,
        category,
        date,
        whatsappLink,
        image,
        location,
        capacity,
        ageGroup
      });

      resetForm();
      setIsEditOpen(false);
      await fetchData();
    } catch (err) {
      console.error("VendorDashboard: Error updating workshop:", err);
      alert("Failed to update workshop.");
    }
  };

  const openEditModal = (ws: Workshop) => {
    setSelectedWorkshop(ws);
    setTitle(ws.title);
    setDescription(ws.description);
    setPrice(ws.price);
    setCategory(ws.category);
    setDate(ws.date);
    setWhatsappLink(ws.whatsappLink || "");
    setLocation(ws.location || "Online");
    setCapacity(ws.capacity || 0);
    setAgeGroup(ws.ageGroup || "All Ages");
    setImage(null); // Reset file input
    setImagePreview(""); // Reset preview
    setIsEditOpen(true);
  };

  const openParticipantsModal = (ws: Workshop) => {
    setSelectedWorkshop(ws);
    setIsParticipantsOpen(true);
  };

  const fetchReviews = async (workshopId: string) => {
    try {
      const q = query(collection(db, "reviews"), where("workshopId", "==", workshopId));
      const snap = await getDocs(q);
      const reviewsData: Review[] = [];
      snap.forEach(doc => {
        reviewsData.push({ id: doc.id, ...doc.data() } as Review);
      });
      // Sort by date desc
      reviewsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReviews(reviewsData);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }
  };

  const openReviewsModal = async (ws: Workshop) => {
    setSelectedWorkshop(ws);
    await fetchReviews(ws.id);
    setIsReviewsOpen(true);
  };

  // Analytics
  const totalRevenue = workshops.reduce((acc, ws) => {
    const count = participantsMap[ws.id]?.filter(p => p.status === 'approved' || !p.status || p.status === 'pending').length || 0;
    return acc + (ws.price * count);
  }, 0);

  const totalParticipants = Object.values(participantsMap).reduce((acc, list) => acc + list.length, 0);

  if (authLoading || loading) return <div className="min-h-screen pt-32 text-center text-white">Loading Dashboard...</div>;

  if (error) return (
    <div className="min-h-screen pt-32 text-center text-white">
      <p className="text-red-400 text-xl mb-4">{error}</p>
      <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20">Retry</button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
          Vendor Dashboard
        </h1>
        <button
          onClick={() => { resetForm(); setIsCreateOpen(true); }}
          className="px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-xl hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] transition"
        >
          + Create Workshop
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <h3 className="text-gray-400 text-sm mb-2">Total Revenue (Est.)</h3>
          <p className="text-3xl font-bold text-green-400">Rs. {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <h3 className="text-gray-400 text-sm mb-2">Total Registrations</h3>
          <p className="text-3xl font-bold text-sky-400">{totalParticipants}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <h3 className="text-gray-400 text-sm mb-2">Active Workshops</h3>
          <p className="text-3xl font-bold text-indigo-400">{workshops.length}</p>
        </div>
      </div>

      {/* Revenue Chart */}
      {workshops.length > 0 && (
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl mb-12 shadow-[0_0_30px_rgba(56,189,248,0.1)]">
          <h3 className="text-xl font-bold text-white mb-6">Revenue by Workshop</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={workshops.map(ws => {
                  const count = participantsMap[ws.id]?.filter(p => p.status === 'approved' || !p.status || p.status === 'pending').length || 0;
                  return {
                    name: ws.title.length > 15 ? ws.title.substring(0, 15) + '...' : ws.title,
                    revenue: ws.price * count,
                    fullTitle: ws.title
                  };
                })}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#4ade80' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="revenue" fill="#38bdf8" radius={[4, 4, 0, 0]}>
                  {workshops.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#38bdf8', '#818cf8', '#c084fc', '#f472b6'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* WORKSHOP LIST */}
      <h2 className="text-2xl font-bold text-white mb-6">Your Workshops</h2>

      {workshops.length === 0 ? (
        <p className="text-gray-400">No workshops yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {workshops.map((ws) => (
            <div
              key={ws.id}
              className="p-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_0_35px_rgba(56,189,248,0.15)]"
            >
              <div className="flex gap-4 mb-4">
                <div className="w-24 h-24 overflow-hidden rounded-xl">
                  {(ws.imageBase64 || ws.imageUrl) ? (
                    <img
                      src={ws.imageBase64 || ws.imageUrl}
                      alt={ws.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <i className="fa-solid fa-image text-gray-500 text-2xl"></i>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{ws.title}</h3>
                  <p className="text-sky-300 font-semibold">
                    Rs. {ws.price ? ws.price.toLocaleString() : "0"}
                  </p>
                  <p className="text-gray-400 text-sm">{new Date(ws.date).toLocaleDateString()}</p>
                  <p className="text-gray-500 text-xs mt-1">{ws.location} • {ws.ageGroup}</p>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => openEditModal(ws)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => openReviewsModal(ws)}
                  className="flex-1 px-4 py-2 bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 rounded-xl text-sm font-semibold transition"
                >
                  Reviews
                </button>
                <button
                  onClick={() => openParticipantsModal(ws)}
                  className="flex-1 px-4 py-2 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 rounded-xl text-sm font-semibold transition"
                >
                  Participants ({participantsMap[ws.id]?.length || 0})
                </button>
                <button
                  onClick={async () => {
                    if (confirm("Are you sure?")) {
                      await deleteWorkshop(ws.id);
                      await fetchData();
                    }
                  }}
                  className="px-4 py-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-xl text-sm font-semibold transition"
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {(isCreateOpen || isEditOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0f172a] border border-white/10 p-0 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-2xl font-bold text-white">
                  {isEditOpen ? "Edit Workshop" : "Create New Workshop"}
                </h2>
                <button onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); resetForm(); }} className="text-gray-400 hover:text-white transition">
                  <i className="fa-solid fa-times text-xl"></i>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">

                {/* Section 1: Basic Info */}
                <section>
                  <h3 className="text-sky-400 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-info-circle"></i> Basic Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-gray-400 text-xs mb-2">Workshop Title</label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition"
                        placeholder="e.g. Master Digital Art in 30 Days"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-2">Category</label>
                      <div className="relative">
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 outline-none appearance-none cursor-pointer"
                        >
                          {CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-gray-900">{cat}</option>)}
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"></i>
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-2">Price (LKR)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rs.</span>
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(Number(e.target.value))}
                          className="w-full pl-12 pr-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 outline-none transition"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-gray-400 text-xs mb-2">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 outline-none transition h-32 resize-none"
                        placeholder="Describe what participants will learn..."
                      />
                    </div>
                  </div>
                </section>

                {/* Section 2: Logistics */}
                <section>
                  <h3 className="text-indigo-400 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-calendar-alt"></i> Logistics & Details
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-400 text-xs mb-2">Date</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-2">Location</label>
                      <div className="relative">
                        <i className="fa-solid fa-location-dot absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
                        <input
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 outline-none transition"
                          placeholder="e.g. Online (Zoom) or Colombo 07"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-2">Capacity (Seats)</label>
                      <input
                        type="number"
                        value={capacity}
                        onChange={(e) => setCapacity(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 outline-none transition"
                        placeholder="e.g. 50"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-2">Target Audience</label>
                      <div className="relative">
                        <select
                          value={ageGroup}
                          onChange={(e) => setAgeGroup(e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 outline-none appearance-none cursor-pointer"
                        >
                          <option value="All Ages" className="bg-gray-900">All Ages</option>
                          <option value="Kids (5-12)" className="bg-gray-900">Kids (5-12)</option>
                          <option value="Teens (13-18)" className="bg-gray-900">Teens (13-18)</option>
                          <option value="Adults (18+)" className="bg-gray-900">Adults (18+)</option>
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"></i>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 3: Media & Links */}
                <section>
                  <h3 className="text-purple-400 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-link"></i> Media & Links
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-gray-400 text-xs mb-2">WhatsApp Group Link</label>
                      <div className="relative">
                        <i className="fa-brands fa-whatsapp absolute left-4 top-1/2 -translate-y-1/2 text-green-500"></i>
                        <input
                          value={whatsappLink}
                          onChange={(e) => setWhatsappLink(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 outline-none transition"
                          placeholder="https://chat.whatsapp.com/..."
                        />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">Participants will receive this link after successful payment.</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-gray-400 text-xs mb-2">Workshop Cover Image</label>
                      <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-sky-500/50 transition bg-white/5 cursor-pointer relative group overflow-hidden">
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                          onChange={(e) => {
                            console.log("File selected:", e.target.files?.[0]);
                            handleImageChange(e);
                          }}
                        />
                        {!imagePreview && !selectedWorkshop?.imageUrl ? (
                          <div className="flex flex-col items-center gap-2 pointer-events-none">
                            <i className="fa-solid fa-cloud-arrow-up text-3xl text-gray-500 group-hover:text-sky-400 transition"></i>
                            <p className="text-sm text-gray-400">Click or drag to upload cover image</p>
                          </div>
                        ) : (
                          <div className="relative w-full h-48 rounded-lg overflow-hidden pointer-events-none">
                            <img
                              src={imagePreview || selectedWorkshop?.imageUrl}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                              <p className="text-white font-bold">Change Image</p>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Fallback Input */}
                      <div className="mt-2 text-right">
                        <label className="text-xs text-gray-500 mr-2">Trouble uploading?</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="text-xs text-gray-400 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20"
                        />
                      </div>
                    </div>
                  </div>
                </section>

              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-4">
                <button
                  onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); resetForm(); }}
                  className="px-6 py-3 text-gray-400 hover:text-white transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={isEditOpen ? handleEdit : handleCreate}
                  className="px-8 py-3 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:shadow-[0_0_30px_rgba(56,189,248,0.6)] hover:scale-105 transition"
                >
                  {isEditOpen ? "Save Changes" : "Create Workshop"}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Participants Modal */}
      <AnimatePresence>
        {isParticipantsOpen && selectedWorkshop && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0a0f1f] border border-white/20 p-8 rounded-3xl w-full max-w-3xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Participants: {selectedWorkshop.title}
                </h2>
                <button onClick={() => setIsParticipantsOpen(false)} className="text-gray-400 hover:text-white">
                  <i className="fa-solid fa-times text-xl"></i>
                </button>
              </div>

              <div className="overflow-x-auto bg-white/5 border border-white/10 rounded-2xl">
                <table className="w-full text-left text-gray-300">
                  <thead className="bg-white/5 text-gray-400 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-4">Participant</th>
                      <th className="px-6 py-4">Contact</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Payment</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {participantsMap[selectedWorkshop.id]?.length > 0 ? (
                      participantsMap[selectedWorkshop.id].map((p, i) => (
                        <tr key={i} className="hover:bg-white/5 transition">
                          <td className="px-6 py-4">
                            <p className="font-bold text-white">{p.displayName}</p>
                            <p className="text-xs text-gray-500">ID: {p.uid.slice(0, 6)}...</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm">{p.email}</p>
                            <p className="text-xs text-gray-500">{p.phoneNumber || "N/A"}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                              p.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                'bg-yellow-500/20 text-yellow-400'
                              }`}>
                              {p.status ? p.status.toUpperCase() : "PENDING"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-white text-sm">Rs. {selectedWorkshop.price}</span>
                              {p.receiptUrl ? (
                                <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-400 hover:underline flex items-center gap-1">
                                  <i className="fa-solid fa-paperclip"></i> View Receipt
                                </a>
                              ) : p.receiptBase64 ? (
                                <a href={p.receiptBase64} download={`receipt_${p.displayName.replace(/\s+/g, '_')}.pdf`} className="text-xs text-sky-400 hover:underline flex items-center gap-1">
                                  <i className="fa-solid fa-file-pdf"></i> Download Receipt
                                </a>
                              ) : (
                                <span className="text-xs text-gray-500">No Receipt</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {p.status === 'pending' && (
                                <>
                                  <button
                                    onClick={async () => {
                                      if (!p.registrationId) return;
                                      if (confirm("Approve this participant?")) {
                                        await updateDoc(doc(db, "registrations", p.registrationId), { status: "approved" });
                                        await fetchData();
                                      }
                                    }}
                                    className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition"
                                    title="Approve"
                                  >
                                    <i className="fa-solid fa-check"></i>
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!p.registrationId) return;
                                      if (confirm("Reject this participant?")) {
                                        await updateDoc(doc(db, "registrations", p.registrationId), { status: "rejected" });
                                        await fetchData();
                                      }
                                    }}
                                    className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                                    title="Reject"
                                  >
                                    <i className="fa-solid fa-times"></i>
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => {
                                  const element = document.createElement("a");
                                  const file = new Blob([`Consent Form\n\nParticipant: ${p.displayName}\nEmail: ${p.email}\nWorkshop: ${selectedWorkshop.title}\nDate: ${new Date().toLocaleDateString()}\n\nI hereby agree to the terms and conditions.`], { type: 'text/plain' });
                                  element.href = URL.createObjectURL(file);
                                  element.download = `consent_${p.displayName.replace(/\s+/g, '_')}.txt`;
                                  document.body.appendChild(element);
                                  element.click();
                                }}
                                className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                                title="Download Consent"
                              >
                                <i className="fa-solid fa-file-contract"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          No participants found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Reviews Modal */}
      <AnimatePresence>
        {isReviewsOpen && selectedWorkshop && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0a0f1f] border border-white/20 p-8 rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Reviews: {selectedWorkshop.title}
                </h2>
                <button onClick={() => setIsReviewsOpen(false)} className="text-gray-400 hover:text-white">
                  <i className="fa-solid fa-times text-xl"></i>
                </button>
              </div>

              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-white/5 border border-white/10 p-4 rounded-xl">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-white">{review.userName}</p>
                          <div className="flex gap-1 text-yellow-400 text-xs">
                            {[1, 2, 3, 4, 5].map(star => (
                              <i key={star} className={`${star <= review.rating ? "fa-solid" : "fa-regular"} fa-star`}></i>
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-300 text-sm">{review.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <i className="fa-regular fa-comment-dots text-4xl mb-2"></i>
                  <p>No reviews yet.</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorDashboard;
