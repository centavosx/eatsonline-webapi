const firebase = require('firebase');
const app = firebase.initializeApp({

    apiKey: "AIzaSyD7bOFb3RqJrrT54pJBLbweFGTkqfgMsYo",

    authDomain: "eatsonlinedb-7f921.firebaseapp.com",
  
    databaseURL: "https://eatsonlinedb-7f921-default-rtdb.asia-southeast1.firebasedatabase.app",
  
    projectId: "eatsonlinedb-7f921",
  
    storageBucket: "eatsonlinedb-7f921.appspot.com",
  
    messagingSenderId: "55476911271",
  
    appId: "1:55476911271:web:d353e08736a11ba5df6f82",
  
    measurementId: "G-8YPGVVNZDH"

  });
  const data = app.database();
  module.exports = data;