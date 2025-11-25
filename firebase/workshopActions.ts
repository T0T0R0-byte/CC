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
} from "firebase/firestore";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface WorkshopData {
  title: string;
  description: string;
  price: number;
  date: string;
  category: string;
  image: File | null;
  whatsappLink?: string;
}

// CREATE WORKSHOP
export const createWorkshop = async (vendorId: string, data: WorkshopData) => {
  let imageUrl = "";

  console.log("createWorkshop: Starting creation for", data.title);

  // Upload image if exists
  if (data.image) {
    console.log("createWorkshop: Uploading image...", data.image.name);
    try {
      const imageRef = ref(
        storage,
        `workshops/${Date.now()}-${data.image.name}`
      );
      await uploadBytes(imageRef, data.image);
      imageUrl = await getDownloadURL(imageRef);
      console.log("createWorkshop: Image uploaded, URL:", imageUrl);
    } catch (error) {
      console.error("createWorkshop: Image upload failed:", error);
      throw error; // Re-throw to handle in UI
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
    imageUrl,
    createdAt: serverTimestamp(),
  });
  console.log("createWorkshop: Document created.");
};

// GET ALL WORKSHOPS FOR A VENDOR
export const getVendorWorkshops = async (vendorId: string) => {
  const q = query(
    collection(db, "workshops"),
    where("vendorId", "==", vendorId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// UPDATE WORKSHOP
export const updateWorkshop = async (id: string, data: Partial<WorkshopData>) => {
  const refDoc = doc(db, "workshops", id);
  let imageUrl = "";

  // Handle Image Update
  if (data.image) {
    console.log("updateWorkshop: Uploading new image...", data.image.name);
    try {
      const imageRef = ref(
        storage,
        `workshops/${Date.now()}-${data.image.name}`
      );
      await uploadBytes(imageRef, data.image);
      imageUrl = await getDownloadURL(imageRef);
      console.log("updateWorkshop: New image uploaded:", imageUrl);
    } catch (error) {
      console.error("updateWorkshop: Image upload failed:", error);
      throw error;
    }
  }

  // prevent file objects from being stored accidentally
  const cleanedData = { ...data } as any;
  delete cleanedData.image;

  // If we uploaded a new image, update the imageUrl field
  if (imageUrl) {
    cleanedData.imageUrl = imageUrl;
  }

  await updateDoc(refDoc, cleanedData);
  console.log("updateWorkshop: Workshop updated.");
};

// DELETE WORKSHOP
export const deleteWorkshop = async (id: string) => {
  const refDoc = doc(db, "workshops", id);
  await deleteDoc(refDoc);
};

// REGISTER FOR WORKSHOP (New)
export const registerForWorkshop = async (
  workshopId: string,
  userId: string,
  receiptFile: File
) => {
  let receiptUrl = "";

  // Upload Receipt
  if (receiptFile) {
    const receiptRef = ref(
      storage,
      `receipts/${workshopId}/${userId}-${Date.now()}`
    );
    await uploadBytes(receiptRef, receiptFile);
    receiptUrl = await getDownloadURL(receiptRef);
  }

  // Create Registration Document
  await addDoc(collection(db, "registrations"), {
    workshopId,
    userId,
    receiptUrl,
    status: "pending", // Vendor can approve later
    createdAt: serverTimestamp(),
    consentAccepted: true,
  });

  // Update User's Registered Workshops (for UI check)
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    registeredWorkshops: arrayUnion(workshopId),
  });
};
