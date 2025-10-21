
import { auth, db } from '../firebase-config.js';
import { createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { setDoc, doc, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const registerForm = document.querySelector('.form');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = registerForm.first.value;
    const lastName = registerForm.last.value;
    const email = registerForm.email.value;
    const password = registerForm.password.value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await sendEmailVerification(user);

        await setDoc(doc(db, "users", user.uid), {
            name: `${firstName} ${lastName}`,
            email: email,
            role: "resident",
            contact_number: "",
            address: "",
            createdAt: Timestamp.now(),
            emailVerified: user.emailVerified
        });

        alert("Registration successful! A verification link has been sent to your email. Please verify your account before logging in.");
        window.location.href = "login.html";

    } catch (error) {
        console.error("Firebase Registration Error:", error);
        alert(`Registration Failed: ${error.message}`);
    }
});
