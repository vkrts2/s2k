// src/lib/firebase.ts
'use client';

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TEMPORARY DEBUGGING: Hardcoding the config to bypass .env file issues
const firebaseConfig = {
  apiKey: "AIzaSyDm26Mbf_tS9Nip4KbxFlu_4ZWFWTVbBie0",
  authDomain: "s2kk-55b9a.firebaseapp.com",
  projectId: "s2kk-55b9a",
  storageBucket: "s2kk-55b9a.firebasestorage.app",
  messagingSenderId: "151060050581",
  appId: "1:151060050581:web:ea81e1ead80905eb35a19c",
  measurementId: "G-S1799H31N6"
};

// Log the project ID to the browser console to verify it
console.log("Connecting to Firebase Project ID:", firebaseConfig.projectId);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
