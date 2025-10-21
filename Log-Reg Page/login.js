
import { auth, db } from '../firebase-config.js';
import { signInWithEmailAndPassword, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, getAdditionalUserInfo } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDoc, setDoc, doc, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const loginForm = document.querySelector('.form');
const googleLoginBtn = document.querySelector('.social.google');
const facebookLoginBtn = document.querySelector('.social.fb');

// Email/Password Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await handleSuccessfulLogin(userCredential.user);
    } catch (error) {
        console.error("Error during email/password login:", error);
        alert(`Login failed: ${error.message}`);
    }
});

// Google Login
googleLoginBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const isNewUser = getAdditionalUserInfo(result).isNewUser;

        if (isNewUser) {
            await createUserDoc(result.user);
        }
        await handleSuccessfulLogin(result.user);
    } catch (error) {
        console.error("Error during Google login:", error);
        alert(`Google login failed: ${error.message}`);
    }
});

// Facebook Login
facebookLoginBtn.addEventListener('click', async () => {
    const provider = new FacebookAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const isNewUser = getAdditionalUserInfo(result).isNewUser;

        if (isNewUser) {
            await createUserDoc(result.user);
        }
        await handleSuccessfulLogin(result.user);
    } catch (error) {
        console.error("Error during Facebook login:", error);
        alert(`Facebook login failed: ${error.message}`);
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
