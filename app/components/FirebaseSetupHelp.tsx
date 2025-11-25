"use client";

import { useEffect, useState } from "react";

export default function FirebaseSetupHelp() {
    const [missingKeys, setMissingKeys] = useState<string[]>([]);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const config = {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        };

        const missing = Object.entries(config)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        if (missing.length > 0) {
            setMissingKeys(missing);
            setIsVisible(true);
        }
    }, []);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
            <div className="bg-[#0a0f1f] border border-red-500/50 rounded-3xl p-8 max-w-2xl w-full shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                <h2 className="text-3xl font-bold text-red-400 mb-4">
                    <i className="fa-solid fa-triangle-exclamation mr-3"></i>
                    Firebase Not Configured
                </h2>

                <p className="text-gray-300 mb-6">
                    The application cannot connect to the database because some configuration keys are missing.
                    Please create a file named <code className="text-yellow-400 bg-white/10 px-2 py-1 rounded">.env.local</code> in the root directory and add the following keys:
                </p>

                <div className="bg-black/50 p-4 rounded-xl border border-white/10 font-mono text-sm text-green-400 overflow-x-auto mb-6">
                    <pre>
                        {`NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id`}
                    </pre>
                </div>

                <div className="mb-6">
                    <h3 className="text-white font-semibold mb-2">Missing Keys Detected:</h3>
                    <ul className="grid grid-cols-2 gap-2">
                        {missingKeys.map((key) => (
                            <li key={key} className="text-red-300 text-sm flex items-center">
                                <i className="fa-solid fa-xmark mr-2"></i> {key}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-gray-400 text-sm italic">
                    Note: You can find these values in your Firebase Console under Project Settings.
                    <br />
                    After adding the file, you must <strong>restart the server</strong>.
                </p>

                <button
                    onClick={() => setIsVisible(false)}
                    className="mt-8 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
                >
                    Dismiss (App will likely fail)
                </button>
            </div>
        </div>
    );
}
