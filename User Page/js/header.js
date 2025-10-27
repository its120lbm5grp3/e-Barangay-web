// header.js (type="module")
import { auth, db } from '../../firebase-config.js';
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  const dropdown = document.getElementById('profileDropdown');
  const button = document.getElementById('profileButton');
  const firstNameEl = document.getElementById('menuFirstName');

  if (!dropdown || !button || !firstNameEl) {
    console.warn('Header elements missing; header.js initialization skipped.');
    return;
  }

  // Keep dropdown closed initially (works with both class and data-open CSS)
  function setOpenState(isOpen) {
    if (isOpen) {
      dropdown.classList.add('profile-expanded');
      dropdown.setAttribute('data-open', 'true');
      button.setAttribute('aria-expanded', 'true');
      document.addEventListener('click', onDocumentClick);
      document.addEventListener('keydown', onKeyDown);
    } else {
      dropdown.classList.remove('profile-expanded');
      dropdown.setAttribute('data-open', 'false');
      button.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onKeyDown);
    }
  }

  function toggleMenu(e) {
    e.stopPropagation();
    const currentlyOpen = dropdown.classList.contains('profile-expanded') || dropdown.getAttribute('data-open') === 'true';
    setOpenState(!currentlyOpen);
    if (!currentlyOpen) {
      // focus first interactive item
      const firstRow = dropdown.querySelector('.menu-row');
      if (firstRow) firstRow.focus();
    }
  }

  function onDocumentClick(e) {
    if (!dropdown.contains(e.target)) setOpenState(false);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') setOpenState(false);
  }

  // Toggle button
  button.addEventListener('click', toggleMenu);

  // close on resize/scroll
  window.addEventListener('resize', () => setOpenState(false));
  window.addEventListener('scroll', () => setOpenState(false), { passive: true });

  // menu action delegation (profile/logout)
  dropdown.addEventListener('click', async (e) => {
    const row = e.target.closest('.menu-row');
    if (!row) return;

    const action = row.dataset.action;
    if (action === 'profile') {
      setOpenState(false);
      window.location.href = 'profile.html';
      return;
    }

    if (action === 'status') {
      setOpenState(false);
      window.location.href = 'status.html';
      return;
    }

    if (action === 'logout') {
      setOpenState(false);
      row.disabled = true;
      try {
        await signOut(auth);
        window.location.href = "../Log-Reg Page/login.html";
      } catch (err) {
        console.error('Sign out failed:', err);
        alert('Failed to sign out. Please try again.');
        row.disabled = false;
      }
      return;
    }
  });

  // Keep greeting updated from Firestore when auth state changes
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          const firstName = data.firstName || data.first_name || '';
          firstNameEl.textContent = firstName ? firstName : 'User';
        } else {
          firstNameEl.textContent = 'User';
        }
      } catch (err) {
        console.error('Failed to load user name for dropdown:', err);
        firstNameEl.textContent = 'User';
      }
    } else {
      // not logged in — show default
      firstNameEl.textContent = 'Guest';
    }
  });

  // initialize closed
  setOpenState(false);
});
