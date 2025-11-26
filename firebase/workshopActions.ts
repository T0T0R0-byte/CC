import { db, storage } from "./firebaseConfig";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  setDoc,
  increment,
} from "firebase/firestore";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface WorkshopData {
  title: string;
  description: string;
  price: number;
  date: string;
  category: string;
  image?: File | null;
  whatsappLink?: string;
  location?: string;
  capacity?: number;
  ageGroup?: string;
}

// CREATE WORKSHOP
export const createWorkshop = async (vendorId: string, data: WorkshopData) => {
  let imageUrl = "";
  let imageBase64 = "";

  console.log("createWorkshop: Starting creation for", data.title);

  // Upload image if exists
  if (data.image) {
    console.log("createWorkshop: Processing image...", data.image.name);

    // If file is small (< 700KB), store as Base64 in Firestore
    if (data.image.size < 700 * 1024) {
      console.log("createWorkshop: File is small, converting to Base64...");
      try {
        imageBase64 = await fileToBase64(data.image);
        console.log("createWorkshop: Converted to Base64.");
      } catch (err) {
        console.error("createWorkshop: Base64 conversion failed:", err);
      }
    }

    // If not converted, try Storage
    if (!imageBase64) {
      try {
        console.log("createWorkshop: Uploading to Storage...");
        const imageRef = ref(
          storage,
          `workshops/${Date.now()}-${data.image.name}`
        );
        await uploadBytes(imageRef, data.image);
        imageUrl = await getDownloadURL(imageRef);
        console.log("createWorkshop: Image uploaded, URL:", imageUrl);
      } catch (error) {
        console.error("createWorkshop: Image upload failed:", error);
        // Don't throw, just proceed without image or maybe throw if critical?
        // User said "show up nicely", so image is important.
        // But if storage fails, we might want to let them know.
        // For now, let's throw to be consistent with previous behavior, but with better message.
        throw new Error("Failed to upload image. Please try a smaller file (under 700KB).");
      }
    }
  } else {
    console.log("createWorkshop: No image provided.");
  }

  // Store only clean fields
  await addDoc(collection(db, "workshops"), {
    vendorId,
    title: data.title,
    description: data.description,
    price: data.price,
    category: data.category,
    date: data.date,
    whatsappLink: data.whatsappLink || "",
    location: data.location || "Online",
    capacity: data.capacity || 0,
    ageGroup: data.ageGroup || "All Ages",
    imageUrl,
    imageBase64,
    createdAt: serverTimestamp(),
  });
  console.log("createWorkshop: Document created.");
};

// GET ALL WORKSHOPS FOR A VENDOR
export const getVendorWorkshops = async (vendorId: string) => {
  const q = query(collection(db, "workshops"), where("vendorId", "==", vendorId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// UPDATE WORKSHOP
export const updateWorkshop = async (workshopId: string, data: Partial<WorkshopData>) => {
  let imageUrl = "";

  if (data.image) {
    const imageRef = ref(storage, `workshops/${Date.now()}-${data.image.name}`);
    await uploadBytes(imageRef, data.image);
    imageUrl = await getDownloadURL(imageRef);
  }

  const updateData: any = {
    title: data.title,
    description: data.description,
    price: data.price,
    category: data.category,
    date: data.date,
    whatsappLink: data.whatsappLink,
    location: data.location,
    capacity: data.capacity,
    ageGroup: data.ageGroup,
  };

  if (imageUrl) {
    updateData.imageUrl = imageUrl;
  }

  // Remove undefined fields
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

  await updateDoc(doc(db, "workshops", workshopId), updateData);
  console.log("updateWorkshop: Workshop updated.");
};

// DELETE WORKSHOP
export const deleteWorkshop = async (id: string) => {
  const refDoc = doc(db, "workshops", id);
  await deleteDoc(refDoc);
};

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// REGISTER FOR WORKSHOP (New)
export const registerForWorkshop = async (
  workshopId: string,
  userId: string,
  receiptFile: File | null,
  participantDetails: {
    fullName: string;
    age: string;
    phone: string;
    address: string;
  }
) => {
  console.log("registerForWorkshop: Starting...");
  let receiptUrl = "";
  let receiptBase64 = "";

  // Upload Receipt
  if (receiptFile) {
    console.log("registerForWorkshop: Processing receipt...", receiptFile.name);

    // If file is small (< 700KB), store as Base64 in Firestore to avoid Storage issues
    if (receiptFile.size < 700 * 1024) {
      console.log("registerForWorkshop: File is small, converting to Base64...");
      try {
        receiptBase64 = await fileToBase64(receiptFile);
        console.log("registerForWorkshop: Converted to Base64.");
      } catch (err) {
        console.error("registerForWorkshop: Base64 conversion failed:", err);
        // Fallback to storage if conversion fails (unlikely)
      }
    }

    // If not converted (too large or failed), try Storage
    if (!receiptBase64) {
      console.log("registerForWorkshop: Uploading to Storage...");
      try {
        const sanitizedName = receiptFile.name.replace(/[^a-zA-Z0-9.]/g, "_");
        const receiptRef = ref(
          storage,
          `receipts/${workshopId}/${userId}-${Date.now()}-${sanitizedName}`
        );
        await uploadBytes(receiptRef, receiptFile);
        receiptUrl = await getDownloadURL(receiptRef);
        console.log("registerForWorkshop: Receipt uploaded. URL:", receiptUrl);
      } catch (storageErr) {
        console.error("registerForWorkshop: Storage upload failed:", storageErr);
        throw new Error("Failed to upload receipt. Please try a smaller file (under 700KB) or check your connection.");
      }
    }
  }

  // Create Registration Document
  console.log("registerForWorkshop: Creating registration doc...");
  await addDoc(collection(db, "registrations"), {
    workshopId,
    userId,
    receiptUrl,
    receiptBase64, // Store Base64 if used
    status: "pending", // Vendor can approve later
    createdAt: serverTimestamp(),
    consentAccepted: true,
    participantDetails, // Save participant details
  });

  // Update User's Registered Workshops (for UI check)
  console.log("registerForWorkshop: Updating user doc...");
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, {
    registeredWorkshops: arrayUnion(workshopId),
  }, { merge: true });

  // Decrement Workshop Capacity
  console.log("registerForWorkshop: Decrementing capacity...");
  const workshopRef = doc(db, "workshops", workshopId);
  await updateDoc(workshopRef, {
    capacity: increment(-1)
  });

  console.log("registerForWorkshop: Complete.");
};
