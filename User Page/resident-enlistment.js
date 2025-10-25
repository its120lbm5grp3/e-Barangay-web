import { auth, db } from '../firebase-config.js';
import { doc, getDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.form');
    const firstNameField = document.getElementById('first_name');
    const lastNameField = document.getElementById('last_name');
    const addressField = document.getElementById('address');
    const contactField = document.getElementById('contact');
    const civilStatusField = document.getElementById('civil_status');
    const purposeField = document.getElementById('purpose');

    const modal = document.getElementById('modal');
    const modalMessage = document.getElementById('modal-message');
    const modalOkButton = document.getElementById('modal-ok');

    const showModal = (message) => {
        modalMessage.textContent = message;
        modal.style.display = 'block';
    };

    const hideModal = () => {
        modal.style.display = 'none';
    };

    modalOkButton.addEventListener('click', hideModal);

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                firstNameField.value = userData.firstName || '';
                lastNameField.value = userData.lastName || '';
                addressField.value = userData.address ? `${userData.address.blkNo} ${userData.address.street}, ${userData.address.town}, ${userData.address.city}, ${userData.address.zip}` : '';
            }
        } else {
            // User is not logged in, redirect to login page
            window.location.href = '../Log-Reg Page/login.html';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const user = auth.currentUser;
        if (!user) {
            showModal('You must be logged in to submit an enlistment request.');
            return;
        }

        if (!civilStatusField.value) {
            showModal('Please select a civil status.');
            return;
        }

        if (!purposeField.value) {
            showModal('Please select a purpose for registration.');
            return;
        }

        try {
            await addDoc(collection(db, 'resident_enlistments'), {
                userId: user.uid,
                firstName: firstNameField.value,
                lastName: lastNameField.value,
                address: addressField.value,
                contact: contactField.value,
                civilStatus: civilStatusField.value,
                purpose: purposeField.value,
                createdAt: serverTimestamp()
            });

            showModal('Your enlistment request has been submitted successfully!');
            form.reset();
        } catch (error) {
            console.error('Error submitting enlistment request:', error);
            showModal('An error occurred while submitting your request. Please try again.');
        }
    });
});
