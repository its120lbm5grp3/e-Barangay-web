import { auth, db } from '../firebase-config.js';
import { signInWithEmailAndPassword, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, getAdditionalUserInfo } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDoc, setDoc, doc, Timestamp, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector('.form');
  const googleLoginBtn = document.querySelector('.social.google');
  const facebookLoginBtn = document.querySelector('.social.fb');

  const modalOverlay = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const modalFooter = modalOverlay.querySelector('.modal-container-footer');

  function showModal(title, message, showOk = false) {
    modalTitle.textContent = title;
    modalMessage.innerHTML = message;

    modalFooter.innerHTML = `
      <button class="button is-ghost modal-close">Close</button>
      ${showOk ? '<button class="button is-primary modal-ok">OK</button>' : ''}
    `;

    modalOverlay.hidden = false;
    requestAnimationFrame(() => {
      modalOverlay.classList.add('active');
      modalOverlay.querySelector('.modal-container').classList.add('active');
    });

    const closeButtons = modalFooter.querySelectorAll('.modal-close');
    closeButtons.forEach(btn => btn.addEventListener('click', hideModal));

    const okBtn = modalFooter.querySelector('.modal-ok');
    if (okBtn) okBtn.addEventListener('click', hideModal);

    const headerCloseBtn = modalOverlay.querySelector('.modal-container-header .modal-close');
    if (headerCloseBtn) headerCloseBtn.addEventListener('click', hideModal);

    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) hideModal();
    });
  }

  function hideModal() {
    const modalContainer = modalOverlay.querySelector('.modal-container');
    modalOverlay.classList.remove('active');
    modalContainer.classList.remove('active');
    setTimeout(() => {
      modalOverlay.hidden = true;
    }, 300);
  }

  // Email/password login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('input[name="email"]').value.trim();
    const password = loginForm.querySelector('input[name="password"]').value.trim();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await user.reload();

      if (user.emailVerified) {
        await handleSuccessfulLogin(user);
      } else {
        showModal('Email Verification Required', '<p>Your email has not been verified. Please check your inbox for a verification link.</p>', true);
      }
    } catch (error) {
      console.error("Error during email/password login:", error);
      showModal('Login Failed', `<p>${error.message}</p>`, true);
    }
  });

  // Google login
  googleLoginBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const isNewUser = getAdditionalUserInfo(result).isNewUser;
      if (isNewUser) await createUserDoc(result.user);
      await handleSuccessfulLogin(result.user);
    } catch (error) {
      console.error("Error during Google login:", error);
      showModal('Google Login Failed', `<p>${error.message}</p>`, true);
    }
  });

  // Facebook login
  facebookLoginBtn.addEventListener('click', async () => {
    const provider = new FacebookAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const isNewUser = getAdditionalUserInfo(result).isNewUser;
      if (isNewUser) await createUserDoc(result.user);
      await handleSuccessfulLogin(result.user);
    } catch (error) {
      console.error("Error during Facebook login:", error);
      showModal('Facebook Login Failed', `<p>${error.message}</p>`, true);
    }
  });

  async function createUserDoc(user) {
    const names = user.displayName.split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ');

    await setDoc(doc(db, "users", user.uid), {
      firstName,
      lastName,
      email: user.email,
      emailVerified: true,
      role: "resident",
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
    });
  }

  async function handleSuccessfulLogin(user) {
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();

      if (user.emailVerified && !userData.emailVerified) {
        await updateDoc(userDocRef, {
          emailVerified: true
        });
      }

      if (userData.role === "admin") {
        window.location.href = "../Admin Page/dashboard.html";
      } else {
        window.location.href = "../User Page/index.html";
      }
    } else {
      await createUserDoc(user);
      window.location.href = "../User Page/index.html";
    }
  }
});