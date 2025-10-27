// login.js
import { auth, db } from '../../firebase-config.js';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
  sendEmailVerification,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector('.form');
  const googleLoginBtn = document.querySelector('.social.google');
  const facebookLoginBtn = document.querySelector('.social.fb');

  const modalOverlay = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const modalFooter = modalOverlay.querySelector('.modal-container-footer');

  // Expose a logout helper so other pages can call window.appSignOut()
  window.appSignOut = async function () {
    try {
      await signOut(auth);
      window.location.href = "login.html";
    } catch (err) {
      console.error("Sign out failed:", err);
      // fallback: still redirect to login
      window.location.href = "login.html";
    }
  };

  // === modal helpers (same UX as register.js) ===
  function showModal(title, message, showCheckBtn = false) {
    modalTitle.textContent = title;
    modalMessage.innerHTML = message;

    modalFooter.innerHTML = `
      <button class="button is-ghost modal-close">Close</button>
      ${showCheckBtn ? '<button id="checkVerificationBtn" class="button is-primary">I\'ve Verified My Email</button>' : ''}
    `;

    modalOverlay.hidden = false;
    requestAnimationFrame(() => {
      modalOverlay.classList.add('active');
      modalOverlay.querySelector('.modal-container').classList.add('active');
    });

    // Close handlers
    modalFooter.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', hideModal));
    const headerCloseBtn = modalOverlay.querySelector('.modal-container-header .modal-close');
    if (headerCloseBtn) headerCloseBtn.addEventListener('click', hideModal);
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) hideModal(); });

    // Attach verification check button if present
    const checkBtn = document.getElementById('checkVerificationBtn');
    if (checkBtn) checkBtn.addEventListener('click', checkEmailVerification);
  }

  function hideModal() {
    const modalContainer = modalOverlay.querySelector('.modal-container');
    modalOverlay.classList.remove('active');
    modalContainer.classList.remove('active');
    setTimeout(() => { modalOverlay.hidden = true; }, 300);
  }

  // === Firestore helpers ===
  // Returns snapshot or null on permission error (non-blocking)
  async function safeGetDoc(ref) {
    try {
      return await getDoc(ref);
    } catch (err) {
      console.warn("safeGetDoc permission error / failure:", err);
      return null;
    }
  }

  // Ensure the user's full profile doc exists (creates full payload if missing).
  // Returns true if doc exists (after operation) or false if write failed.
  async function ensureUserDocExists(user) {
    const userDocRef = doc(db, "users", user.uid);

    // Try to read doc
    const snap = await safeGetDoc(userDocRef);
    if (snap && snap.exists()) {
      // Document exists — nothing to create
      return true;
    }

    // Build payload (full profile fields like register.js)
    const displayName = user.displayName || '';
    const names = displayName.split(' ').filter(Boolean);
    const firstName = names[0] || '';
    const lastName = names.slice(1).join(' ') || '';

    const payload = {
      firstName,
      lastName,
      email: user.email || '',
      emailVerified: !!user.emailVerified,
      role: "resident",
      status: "active",
      createdAt: Timestamp.now(),
      sex: "",
      address: {
        blkNo: "",
        street: "",
        town: "",
        city: "",
        zip: "",
        country: ""
      }
    };

    // Attempt to write full doc (setDoc with merge: false to create a full doc)
    try {
      await setDoc(userDocRef, payload, { merge: true }); // merge true to be safer
      return true;
    } catch (err) {
      console.warn("Could not create user doc (permission or other error):", err);
      return false;
    }
  }

  // Ensure emailVerified is set to true in Firestore (if allowed).
  // Returns true if write succeeded or doc already showed emailVerified true.
  async function ensureFirestoreEmailVerified(user) {
    const userDocRef = doc(db, "users", user.uid);

    // Refresh ID token so rules that rely on token.email_verified can evaluate correctly
    try {
      await user.getIdToken(true);
    } catch (err) {
      console.warn("getIdToken(true) failed:", err);
    }

    // Try to read doc
    const snap = await safeGetDoc(userDocRef);
    if (snap && snap.exists()) {
      const data = snap.data();
      if (data.emailVerified === true) return true;
      // Try update
      try {
        await updateDoc(userDocRef, { emailVerified: true });
        return true;
      } catch (err) {
        console.warn("Could not update emailVerified in existing doc:", err);
        return false;
      }
    } else {
      // doc missing: try create (full create to avoid empty fields later)
      try {
        const created = await ensureUserDocExists(user); // this will set emailVerified too
        return created;
      } catch (err) {
        console.warn("Could not create user doc to set emailVerified:", err);
        return false;
      }
    }
  }

  // === Redirect logic ===
  async function redirectAfterLogin(user) {
    // Prefer admin custom claim (no Firestore read)
    try {
      const idTokenResult = await user.getIdTokenResult(true);
      if (idTokenResult.claims && idTokenResult.claims.admin === true) {
        window.location.href = "../admin-page/dashboard.html";
        return;
      }
    } catch (err) {
      console.warn("Could not read id token claims:", err);
    }

    // Try to read the user doc for role; if that fails, fall back to user page.
    const userDocRef = doc(db, "users", user.uid);
    const snap = await safeGetDoc(userDocRef);
    if (snap && snap.exists()) {
      const data = snap.data();
      const role = data.role || 'resident';
      if (role === 'admin') {
        window.location.href = "../admin-page/dashboard.html";
      } else {
        window.location.href = "../user-page/index.html";
      }
      return;
    }

    // Doc missing or unreadable — ensure it's created so profile pages can work,
    // but even if creation fails, we should not block the user: redirect to user page.
    const created = await ensureUserDocExists(user);
    if (!created) {
      console.warn("Could not create user doc before redirect; continuing to user page anyway.");
    }
    window.location.href = "../user-page/index.html";
  }

  // === Main login handler ===
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('input[name="email"]').value.trim();
    const password = loginForm.querySelector('input[name="password"]').value;

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      // Refresh auth user data
      await user.reload();

      if (user.emailVerified) {
        // Try to ensure the Firestore doc exists and emailVerified flag is set.
        // These writes may be denied by rules, so we won't block login on failure,
        // but we WILL wait for create to finish if allowed so the next page finds the data.
        try {
          // Ensure full doc exists (creates missing profile fields)
          await ensureUserDocExists(user);
          // Ensure emailVerified flag is true in Firestore if allowed
          await ensureFirestoreEmailVerified(user);
        } catch (err) {
          console.warn("Non-blocking error ensuring Firestore doc/emailVerified:", err);
        }

        // Redirect
        await redirectAfterLogin(user);
      } else {
        // Not verified -> show verification modal (same UX as register.js)
        showModal(
          'Email Verification Required',
          `<p>Your email is not verified. A verification link should be in your inbox. If you didn't receive it you can resend it below.</p>
           <p>After clicking the link in your email, come back and click "I've Verified My Email".</p>`,
          true
        );

        // Add resend link
        const resendHtml = `<p style="margin-top:8px;"><a href="#" id="resendVerificationLink">Resend verification email</a></p>`;
        modalMessage.insertAdjacentHTML('beforeend', resendHtml);

        const resendLink = document.getElementById('resendVerificationLink');
        if (resendLink) {
          resendLink.addEventListener('click', async (ev) => {
            ev.preventDefault();
            try {
              await sendEmailVerification(user);
              showModal('Sent', `<p>Verification email sent to <strong>${user.email}</strong>. Check your inbox (and spam).</p>`);
            } catch (err) {
              console.error('Failed to resend verification email:', err);
              showModal('Error', `<p>Unable to send verification email: ${err.message || err}</p>`);
            }
          });
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      let message = err.message || 'Login failed';
      if (err.code === 'auth/user-not-found') message = 'No account found with that email.';
      if (err.code === 'auth/wrong-password') message = 'Incorrect password.';
      showModal('Login Failed', `<p>${message}</p>`);
    }
  });

  // === "I've Verified My Email" button handler used by modal ===
  async function checkEmailVerification() {
    const user = auth.currentUser;
    if (!user) {
      showModal('Error', '<p>No user is logged in. Please sign up or log in again.</p>');
      return;
    }

    try {
      await user.reload();
      await user.getIdToken(true);

      if (user.emailVerified) {
        // Try to write Firestore emailVerified and ensure doc exists (non-blocking)
        await ensureUserDocExists(user);
        await ensureFirestoreEmailVerified(user);

        showModal('Email Verified!', '<p>Your email has been verified. Redirecting now...</p>');
        setTimeout(() => redirectAfterLogin(user), 1000);
      } else {
        showModal('Still Not Verified', '<p>Your email is still not verified. Click the link in your inbox and try again, or resend the verification email.</p>', true);
      }
    } catch (err) {
      console.error("Error during verification check:", err);
      showModal('Error', `<p>${err.message || err}</p>`);
    }
  }

  // === Social logins ===
  googleLoginBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const isNewUser = getAdditionalUserInfo(result).isNewUser;

      await user.reload();
      await user.getIdToken(true);

      if (isNewUser) {
        const ok = await ensureUserDocExists(user);
        if (!ok) {
          console.warn("Could not create user doc on social signup (non-blocking).");
        }
      } else {
        if (user.emailVerified) {
          await ensureFirestoreEmailVerified(user);
        }
      }

      await redirectAfterLogin(user);
    } catch (err) {
      console.error("Google login failed:", err);
      showModal('Google Login Failed', `<p>${err.message || err}</p>`);
    }
  });

  facebookLoginBtn.addEventListener('click', async () => {
    const provider = new FacebookAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const isNewUser = getAdditionalUserInfo(result).isNewUser;

      await user.reload();
      await user.getIdToken(true);

      if (isNewUser) {
        const ok = await ensureUserDocExists(user);
        if (!ok) {
          console.warn("Could not create user doc on social signup (non-blocking).");
        }
      } else {
        if (user.emailVerified) {
          await ensureFirestoreEmailVerified(user);
        }
      }

      await redirectAfterLogin(user);
    } catch (err) {
      console.error("Facebook login failed:", err);
      showModal('Facebook Login Failed', `<p>${err.message || err}</p>`);
    }
  });
});
