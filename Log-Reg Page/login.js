import { auth, db } from '../firebase-config.js';
import { signInWithEmailAndPassword, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, getAdditionalUserInfo } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDoc, setDoc, doc, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Wait until DOM is ready
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

    // Reset footer and re-add buttons dynamically
    modalFooter.innerHTML = `
      <button class="button is-ghost modal-close">Close</button>
      ${showOk ? '<button class="button is-primary modal-ok">OK</button>' : ''}
    `;

    modalOverlay.hidden = false;
    requestAnimationFrame(() => {
      modalOverlay.classList.add('active');
      modalOverlay.querySelector('.modal-container').classList.add('active');
    });

    // Attach event listeners for footer close buttons
    const closeButtons = modalFooter.querySelectorAll('.modal-close');
    closeButtons.forEach(btn => btn.addEventListener('click', hideModal));

    // Attach listener for OK button if it exists
    const okBtn = modalFooter.querySelector('.modal-ok');
    if (okBtn) okBtn.addEventListener('click', hideModal);

    // Attach listener for the "X" button in the header
    const headerCloseBtn = modalOverlay.querySelector('.modal-container-header .modal-close');
    if (headerCloseBtn) headerCloseBtn.addEventListener('click', hideModal);

    // Allow clicking outside the modal to close
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
      await handleSuccessfulLogin(userCredential.user);
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
    await setDoc(doc(db, "users", user.uid), {
      name: user.displayName,
      email: user.email,
      role: "resident",
      contact_number: "",
      address: "",
      createdAt: Timestamp.now()
    });
  }

  async function handleSuccessfulLogin(user) {
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      if (userData.role === "admin") {
        window.location.href = "../Admin Page/index.html";
      } else {
        window.location.href = "../User Page/index.html";
      }
    } else {
      await createUserDoc(user);
      window.location.href = "../User Page/index.html";
    }
  }
});
