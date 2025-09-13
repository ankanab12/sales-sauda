// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAK86tsBDUZDVl0XrdT4Gn7eJbhe6IDP7g",
  authDomain: "sales-sauda.firebaseapp.com",
  projectId: "sales-sauda",
  storageBucket: "sales-sauda.firebasestorage.app",
  messagingSenderId: "9639131632",
  appId: "1:9639131632:web:c5d911a6948e97866ec535",
  measurementId: "G-G1ZLSMS2CM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);