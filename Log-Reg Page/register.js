import { auth, db } from '../firebase-config.js';
import { createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { setDoc, doc, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.querySelector('.form');
  const modalOverlay = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const modalFooter = modalOverlay.querySelector('.modal-container-footer');

  function showModal(title, message, redirect = false, showOk = false) {
    modalTitle.textContent = title;
    modalMessage.innerHTML = message;

    // Reset footer and dynamically add buttons
    modalFooter.innerHTML = `
      <button class="button is-ghost modal-close">Close</button>
      ${showOk ? '<button class="button is-primary modal-ok">OK</button>' : ''}
    `;

    modalOverlay.hidden = false;
    requestAnimationFrame(() => {
      modalOverlay.classList.add('active');
      modalOverlay.querySelector('.modal-container').classList.add('active');
    });

    // Footer close buttons
    const closeButtons = modalFooter.querySelectorAll('.modal-close');
    closeButtons.forEach(btn => btn.addEventListener('click', () => hideModal(redirect)));

    // OK button
    const okBtn = modalFooter.querySelector('.modal-ok');
    if (okBtn) okBtn.addEventListener('click', () => hideModal(redirect));

    // Header X button
    const headerCloseBtn = modalOverlay.querySelector('.modal-container-header .modal-close');
    if (headerCloseBtn) headerCloseBtn.addEventListener('click', () => hideModal(redirect));

    // Close if clicking outside
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) hideModal(redirect);
    });
  }

  function hideModal(redirect = false) {
    const modalContainer = modalOverlay.querySelector('.modal-container');
    modalOverlay.classList.remove('active');
    modalContainer.classList.remove('active');
    setTimeout(() => {
      modalOverlay.hidden = true;
      if (redirect) window.location.href = "login.html";
    }, 300);
  }

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = registerForm.firstName.value.trim();
    const lastName = registerForm.lastName.value.trim();
    const email = registerForm.email.value.trim();
    const password = registerForm.password.value;
    const confirmPassword = registerForm.confirmPassword.value;

    if (password !== confirmPassword) {
      showModal('Registration Error', '<p>Passwords do not match.</p>', false, true);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      await sendEmailVerification(newUser);

      await setDoc(doc(db, "users", newUser.uid), {
        firstName,
        lastName,
        email,
        emailVerified: false,
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

      showModal('Registration Successful', '<p>A verification link has been sent to your email.</p>', true, true);

    } catch (error) {
      console.error("Firebase Registration Error:", error);
      showModal('Registration Failed', `<p>${error.message}</p>`, false, true);
    }
  });
});
