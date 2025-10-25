
import { auth, db } from '../firebase-config.js';
import { doc, getDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.form');
    const firstNameField = document.getElementById('first_name');
    const lastNameField = document.getElementById('last_name');
    const addressField = document.getElementById('address');

    const modal = document.getElementById('modal');
    const modalMessage = document.getElementById('modal-message');
    const modalOkButton = document.getElementById('modal-ok');

    const termsModal = document.getElementById('termsModal');
    const termsOkButton = document.getElementById('terms-ok');

    const showModal = (message) => {
        modalMessage.textContent = message;
        modal.style.display = 'block';
    };

    const hideModal = () => {
        modal.style.display = 'none';
    };

    const showTermsModal = () => {
        termsModal.style.display = 'block';
    };

    const hideTermsModal = () => {
        termsModal.style.display = 'none';
    };

    modalOkButton.addEventListener('click', hideModal);
    termsOkButton.addEventListener('click', hideTermsModal);

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
            showModal('You must be logged in to submit a request.');
            return;
        }

        const documentType = document.getElementById('document_type').value;
        const reason = document.getElementById('reason').value;

        if (!documentType) {
            showModal('Please select a document type.');
            return;
        }

        try {
            await addDoc(collection(db, 'document_requests'), {
                userId: user.uid,
                firstName: firstNameField.value,
                lastName: lastNameField.value,
                documentType: documentType,
                address: addressField.value,
                reason: reason,
                status: 'Pending',
                createdAt: serverTimestamp()
            });

            showModal('Your document request has been submitted successfully!');
            form.reset();
        } catch (error) {
            console.error('Error submitting document request:', error);
            showModal('An error occurred while submitting your request. Please try again.');
        }
    });
});
