import { auth, rtdb } from './firebase-config.js';
import { ref, onValue, set, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      const userStatusDatabaseRef = ref(rtdb, '/status/' + user.uid);

      const isOnline = {
        isOnline: true,
        last_changed: serverTimestamp(),
      };

      const isOffline = {
        isOnline: false,
        last_changed: serverTimestamp(),
      };

      const connectedRef = ref(rtdb, '.info/connected');
      onValue(connectedRef, (snap) => {
        if (snap.val() === false) {
          return;
        }

        onDisconnect(userStatusDatabaseRef).set(isOffline).then(() => {
          set(userStatusDatabaseRef, isOnline);
        });
      });
    } 
  });
});
