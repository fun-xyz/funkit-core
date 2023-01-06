"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firebase = require('firebase');
const firebaseConfig = {
    apiKey: "AIzaSyDidOyxwsM4THzhtCACjApprDh5gXfJJOU",
    authDomain: "wallet-sdk.firebaseapp.com",
    projectId: "wallet-sdk",
    storageBucket: "wallet-sdk.appspot.com",
    messagingSenderId: "98633293336",
    appId: "1:98633293336:web:4e460501defaaa7475ad6d",
    measurementId: "G-VBNQR1DWYY"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
db.collection('immuna-userOps').doc('hashhashashash').set({
    hello: "dsfsdfdsf"
});
//# sourceMappingURL=ExposedSDK.js.map