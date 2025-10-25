import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, getDocs, doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('.doc-table .table-body');
    const modal = document.getElementById('detailsModal');
    const logoutButton = document.querySelector('.logout-btn');

    // Handle Logout
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            signOut(auth).then(() => {
                window.location.href = '../Log-Reg Page/login.html';
            }).catch((error) => {
                console.error('Logout Error:', error);
                alert('Failed to logout. Please try again.');
            });
        });
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
                loadEnlistments();
            } else {
                window.location.href = '../Log-Reg Page/login.html';
            }
        } else {
            window.location.href = '../Log-Reg Page/login.html';
        }
    });

    async function loadEnlistments() {
        tableBody.innerHTML = ''; // Clear only the table body

        const enlistmentsSnapshot = await getDocs(collection(db, 'ENLISTMENTS'));
        let id = 1;

        for (const enlistmentDoc of enlistmentsSnapshot.docs) {
            const enlistmentData = enlistmentDoc.data();

            const row = document.createElement('div');
            row.classList.add('table-row');

            const date = enlistmentData.createdAt.toDate().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });

            row.innerHTML = `
                <div>${id++}</div>
                <div>${enlistmentData.name}</div>
                <div>${enlistmentData.address}</div>
                <div>${date}</div>
                <div class="status-${enlistmentData.status.toLowerCase()}">${enlistmentData.status}</div>
                <div class="actions">
                    <button class="view-btn"><i class="fa-solid fa-eye"></i> View</button>
                    <button class="approve-btn"><i class="fa-solid fa-check"></i> Approve</button>
                    <button class="reject-btn"><i class="fa-solid fa-xmark"></i> Reject</button>
                </div>
            `;

            row.querySelector('.view-btn').addEventListener('click', () => openModal(id -1, enlistmentData.name, enlistmentData.civilStatus, date, enlistmentData.address, enlistmentData.purposeOfRegistration));
            row.querySelector('.approve-btn').addEventListener('click', () => updateStatus(enlistmentDoc.id, 'approved'));
            row.querySelector('.reject-btn').addEventListener('click', () => updateStatus(enlistmentDoc.id, 'denied'));

            tableBody.appendChild(row);
        }
    }

    async function updateStatus(docId, newStatus) {
        const enlistmentDocRef = doc(db, 'ENLISTMENTS', docId);
        await updateDoc(enlistmentDocRef, { status: newStatus });
        loadEnlistments(); // Refresh the table
    }

    function openModal(id, name, civilStatus, date, address, reason) {
        document.getElementById('modal-title').innerText = `Details about ID ${id}`;
        document.getElementById('modal-name').innerText = name;
        document.getElementById('modal-type').innerText = civilStatus;
        document.getElementById('modal-date').innerText = date;
        document.getElementById('modal-address').innerText = address;
        document.getElementById('modal-reason').value = reason;
        modal.style.display = 'flex';
    }

    window.closeModal = function() {
        modal.style.display = 'none';
    }

    window.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
    });
});
