
import { auth, db } from '../firebase-config.js';
import { createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { setDoc, doc, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const registerForm = document.querySelector('.form');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = registerForm.firstName.value;
    const lastName = registerForm.lastName.value;
    const email = registerForm.email.value;
    const password = registerForm.password.value;
    const confirmPassword = registerForm.confirmPassword.value;

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        await sendEmailVerification(newUser);

        await setDoc(doc(db, "users", newUser.uid), {
            firstName: firstName,
            lastName: lastName,
            email: email,
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

        alert("Registration successful! A verification link has been sent to your email...");
        window.location.href = "login.html";

    } catch (error) {
        console.error("Firebase Registration Error:", error);
        alert(`Registration failed: ${error.message}`);
    }
});
