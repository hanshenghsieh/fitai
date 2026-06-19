// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.20.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.20.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyC95aEy2gq03xtYEf3T8GMrnkPFoqqB8FI',
  authDomain: 'fitai-d89c4.firebaseapp.com',
  projectId: 'fitai-d89c4',
  storageBucket: 'fitai-d89c4.firebasestorage.app',
  messagingSenderId: '403467297093',
  appId: '1:403467297093:web:6622f67e5a0c387f8f9e2c',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload)
  const notificationTitle = payload.notification.title
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/icon.svg',
    badge: '/icon.svg',
    tag: 'fitai-notification',
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})
