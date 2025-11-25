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
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";

interface Workshop {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  date: string;
  vendorId: string;
  whatsappLink?: string;
}

interface Participant {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  receiptUrl?: string;
  status?: "pending" | "approved";
  registrationId?: string;
}

const CATEGORIES = ["Art", "Music", "Technology", "Cooking", "Sports", "Business", "Health", "Other"];

const VendorDashboard: React.FC = () => {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [participantsMap, setParticipantsMap] = useState<Record<string, Participant[]>>({});

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
      alert("Please fill all fields.");
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
        image, // Pass the new image file if selected
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
    setImage(null); // Reset file input
    setImagePreview(""); // Reset preview
    setIsEditOpen(true);
  };

  const openParticipantsModal = (ws: Workshop) => {
    setSelectedWorkshop(ws);
    setIsParticipantsOpen(true);
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
                <img
                  src={ws.imageUrl}
                  alt={ws.title}
                  className="w-24 h-24 object-cover rounded-xl"
                />
                <div>
                  <h3 className="text-xl font-bold text-white">{ws.title}</h3>
                  <p className="text-sky-300 font-semibold">
                    Rs. {ws.price ? ws.price.toLocaleString() : "0"}
                  </p>
                  <p className="text-gray-400 text-sm">{new Date(ws.date).toLocaleDateString()}</p>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0a0f1f] border border-white/20 p-8 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                {isEditOpen ? "Edit Workshop" : "Create New Workshop"}
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <input
                  value={title}
                  className="px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 outline-none"
                  placeholder="Workshop Title"
                  onChange={(e) => setTitle(e.target.value)}
                />

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 outline-none"
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-gray-900">{cat}</option>)}
                </select>

                <input
                  type="number"
                  value={price}
                  className="px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 outline-none"
                  placeholder="Price"
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
                <input
                  type="date"
                  value={date}
                  className="px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 outline-none"
                  onChange={(e) => setDate(e.target.value)}
                />
                <input
                  value={whatsappLink}
                  className="px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 outline-none md:col-span-2"
                  placeholder="WhatsApp Group Link (Optional)"
                  onChange={(e) => setWhatsappLink(e.target.value)}
                />
                <textarea
                  value={description}
                  className="px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-sky-500 outline-none md:col-span-2 h-32"
                  placeholder="Description"
                  onChange={(e) => setDescription(e.target.value)}
                />

                <div className="md:col-span-2">
                  <label className="block text-gray-400 text-sm mb-2">Workshop Image {isEditOpen && "(Leave empty to keep current)"}</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="text-gray-300 w-full"
                    onChange={handleImageChange}
                  />
                  {imagePreview ? (
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 mb-2">New Image Preview:</p>
                      <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-xl border border-white/10" />
                    </div>
                  ) : isEditOpen && selectedWorkshop?.imageUrl ? (
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 mb-2">Current Image:</p>
                      <img src={selectedWorkshop.imageUrl} alt="Current" className="w-full h-48 object-cover rounded-xl border border-white/10" />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-8">
                <button
                  onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); resetForm(); }}
                  className="px-6 py-2 text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={isEditOpen ? handleEdit : handleCreate}
                  className="px-6 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-xl hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] transition"
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

              <div className="space-y-4">
                {participantsMap[selectedWorkshop.id]?.length > 0 ? (
                  participantsMap[selectedWorkshop.id].map((p, i) => (
                    <div key={i} className="bg-white/5 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
                      <div>
                        <p className="font-bold text-white">{p.displayName}</p>
                        <p className="text-sm text-gray-400">{p.email}</p>
                        {p.phoneNumber && <p className="text-sm text-gray-400">{p.phoneNumber}</p>}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`text-sm font-bold ${p.status === 'approved' ? 'text-green-400' : 'text-yellow-400'}`}>
                            {p.status?.toUpperCase()}
                          </p>
                          <p className="text-xs text-gray-500">Rs. {selectedWorkshop.price}</p>
                        </div>
                        {p.receiptUrl && (
                          <a
                            href={p.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 rounded-lg text-sm font-semibold transition"
                          >
                            View Receipt
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center">No participants yet.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorDashboard;
