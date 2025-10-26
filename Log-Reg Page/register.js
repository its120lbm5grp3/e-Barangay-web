import { auth, db } from '../firebase-config.js';
import { createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { setDoc, doc, Timestamp, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.querySelector('.form');
  const modalOverlay = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const modalFooter = modalOverlay.querySelector('.modal-container-footer');

  // === MODAL FUNCTIONS ===
  function showModal(title, message, showCheckBtn = false) {
    modalTitle.textContent = title;
    modalMessage.innerHTML = message;

    // Build modal footer dynamically
    modalFooter.innerHTML = `
      <button class="button is-ghost modal-close">Close</button>
      ${showCheckBtn ? '<button id="checkVerificationBtn" class="button is-primary">I\'ve Verified My Email</button>' : ''}
    `;

    modalOverlay.hidden = false;
    requestAnimationFrame(() => {
      modalOverlay.classList.add('active');
      modalOverlay.querySelector('.modal-container').classList.add('active');
    });

    // Attach Close button event
    const closeButtons = modalFooter.querySelectorAll('.modal-close');
    closeButtons.forEach(btn => btn.addEventListener('click', hideModal));

    // Allow clicking outside modal to close
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) hideModal();
    });

    // Attach verification check if button exists
    const checkBtn = document.getElementById('checkVerificationBtn');
    if (checkBtn) {
      checkBtn.addEventListener('click', checkEmailVerification);
    }
  }

  function hideModal() {
    const modalContainer = modalOverlay.querySelector('.modal-container');
    modalOverlay.classList.remove('active');
    modalContainer.classList.remove('active');
    setTimeout(() => {
      modalOverlay.hidden = true;
    }, 300);
  }

  // === REGISTER FORM SUBMIT ===
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = registerForm.firstName.value.trim();
    const lastName = registerForm.lastName.value.trim();
    const email = registerForm.email.value.trim();
    const password = registerForm.password.value;
    const confirmPassword = registerForm.confirmPassword.value;

    if (password !== confirmPassword) {
      showModal('Registration Error', '<p>Passwords do not match.</p>');
      return;
    }

    try {
      // Create user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Send verification email
      await sendEmailVerification(newUser);

      // Create user doc with emailVerified: false
      await setDoc(doc(db, "users", newUser.uid), {
        firstName,
        lastName,
        email,
        emailVerified: false,
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
      });

      // Show modal with the verification button
      showModal(
        'Verify Your Email',
        `<p>A verification link has been sent to <strong>${email}</strong>.<br>
         Please check your inbox and click the link to verify your email.</p>`,
        true // showCheckBtn
      );
    } catch (error) {
      console.error("Firebase Registration Error:", error);
      showModal('Registration Failed', `<p>${error.message}</p>`);
    }
  });

  // === EMAIL VERIFICATION CHECK FUNCTION ===
  async function checkEmailVerification() {
    const user = auth.currentUser;

    if (!user) {
      showModal('Error', '<p>No user is logged in. Please sign up or log in again.</p>');
      return;
    }

    try {
      await user.reload(); // refresh from Firebase
      if (user.emailVerified) {
        // Update Firestore document
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { emailVerified: true });

        showModal(
          'Email Verified!',
          '<p>Your email has been successfully verified. You can now log in.</p>'
        );

        // Redirect after 2 seconds
        setTimeout(() => {
          window.location.href = "login.html";
        }, 2000);
      } else {
        showModal(
          'Still Not Verified',
          '<p>Your email is not verified yet. Please click the link in your inbox, then try again.</p>',
          true
        );
      }
    } catch (error) {
      console.error("Error checking email verification:", error);
      showModal('Error', `<p>${error.message}</p>`);
    }
  }
});
