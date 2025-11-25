"use client";

import { useState } from "react";
import { doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";

const DEMO_VENDORS = [
    {
        uid: "demo_vendor_art",
        email: "art@studio.com",
        displayName: "Creative Arts Studio",
        role: "vendor",
        photoURL: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&q=80",
        phoneNumber: "+94 77 111 2222"
    },
    {
        uid: "demo_vendor_tech",
        email: "tech@innovators.com",
        displayName: "Tech Innovators",
        role: "vendor",
        photoURL: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&q=80",
        phoneNumber: "+94 77 333 4444"
    },
    {
        uid: "demo_vendor_chef",
        email: "mario@cooking.com",
        displayName: "Chef Mario",
        role: "vendor",
        photoURL: "https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=400&q=80",
        phoneNumber: "+94 77 555 6666"
    }
];

const DEMO_WORKSHOPS = [
    // Art Vendor
    {
        vendorId: "demo_vendor_art",
        title: "Oil Painting Masterclass",
        description: "Learn the secrets of oil painting from scratch. We cover color mixing, brush techniques, and composition. Materials provided.",
        price: 5000,
        category: "Art",
        date: "2024-12-15",
        imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb39279c42?w=800&q=80",
        location: "Colombo 07",
        whatsappLink: "https://chat.whatsapp.com/demo1"
    },
    {
        vendorId: "demo_vendor_art",
        title: "Pottery for Beginners",
        description: "Get your hands dirty and create beautiful ceramic pieces. Perfect for absolute beginners.",
        price: 3500,
        category: "Art",
        date: "2024-12-20",
        imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80",
        location: "Kandy",
        whatsappLink: "https://chat.whatsapp.com/demo2"
    },
    // Tech Vendor
    {
        vendorId: "demo_vendor_tech",
        title: "React Native Bootcamp",
        description: "Build mobile apps for iOS and Android using React Native. 2-day intensive workshop.",
        price: 15000,
        category: "Technology",
        date: "2025-01-10",
        imageUrl: "https://images.unsplash.com/photo-1555099962-4199c345e5dd?w=800&q=80",
        location: "Online",
        whatsappLink: "https://chat.whatsapp.com/demo3"
    },
    {
        vendorId: "demo_vendor_tech",
        title: "AI for Everyone",
        description: "Understand the basics of Artificial Intelligence and how to use tools like ChatGPT effectively.",
        price: 2500,
        category: "Technology",
        date: "2025-01-05",
        imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80",
        location: "Online",
        whatsappLink: "https://chat.whatsapp.com/demo4"
    },
    // Chef Vendor
    {
        vendorId: "demo_vendor_chef",
        title: "Italian Cooking Secrets",
        description: "Make authentic pasta and pizza from scratch. Includes a 3-course meal tasting.",
        price: 8000,
        category: "Cooking",
        date: "2024-12-18",
        imageUrl: "https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=800&q=80",
        location: "Galle Face Hotel",
        whatsappLink: "https://chat.whatsapp.com/demo5"
    },
    {
        vendorId: "demo_vendor_chef",
        title: "Pastry & Baking 101",
        description: "Master the art of French pastries. Croissants, eclairs, and more.",
        price: 6500,
        category: "Cooking",
        date: "2024-12-22",
        imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
        location: "Colombo 03",
        whatsappLink: "https://chat.whatsapp.com/demo6"
    }
];

export default function SeedPage() {
    const [status, setStatus] = useState("Idle");

    const handleSeed = async () => {
        setStatus("Seeding...");
        try {
            // 1. Create Vendors
            for (const vendor of DEMO_VENDORS) {
                await setDoc(doc(db, "users", vendor.uid), vendor);
                console.log(`Created vendor: ${vendor.displayName}`);
            }

            // 2. Create Workshops
            for (const workshop of DEMO_WORKSHOPS) {
                await addDoc(collection(db, "workshops"), {
                    ...workshop,
                    createdAt: serverTimestamp()
                });
                console.log(`Created workshop: ${workshop.title}`);
            }

            setStatus("Success! Database seeded.");
        } catch (error) {
            console.error(error);
            setStatus("Error: " + (error as Error).message);
        }
    };

    return (
        <div className="min-h-screen pt-32 flex flex-col items-center justify-center text-white">
            <h1 className="text-4xl font-bold mb-8">Database Seeder</h1>
            <p className="mb-8 text-gray-400 max-w-md text-center">
                This will create 3 demo vendors and 6 workshops.
                Note: These vendors are for display only and cannot be logged into without creating Auth accounts.
            </p>

            <button
                onClick={handleSeed}
                className="px-8 py-4 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-xl font-bold text-xl hover:shadow-[0_0_30px_rgba(56,189,248,0.4)] transition"
            >
                Generate Demo Data
            </button>

            <p className="mt-8 text-xl font-mono text-green-400">{status}</p>
        </div>
    );
}
