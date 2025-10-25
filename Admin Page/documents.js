import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('.doc-table .table-body');
    const modal = document.getElementById('detailsModal');
    const logoutButton = document.querySelector('.logout-btn');
    let adminId = null;

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
            adminId = user.uid;
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
                loadDocuments();
            } else {
                window.location.href = '../Log-Reg Page/login.html';
            }
        } else {
            window.location.href = '../Log-Reg Page/login.html';
        }
    });

    async function loadDocuments() {
        tableBody.innerHTML = ''; // Clear only the table body

        const requestsSnapshot = await getDocs(collection(db, 'REQUESTS'));
        let id = 1;

        for (const requestDoc of requestsSnapshot.docs) {
            const requestData = requestDoc.data();

            const row = document.createElement('div');
            row.classList.add('table-row');

            const date = requestData.createdAt.toDate().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });

            row.innerHTML = `
                <div>${id++}</div>
                <div>${requestData.name}</div>
                <div>${requestData.documentType}</div>
                <div>${date}</div>
                <div class="status-${requestData.status.toLowerCase()}">${requestData.status}</div>
                <div class="actions">
                    <button class="view-btn"><i class="fa-solid fa-eye"></i> View</button>
                    <button class="approve-btn"><i class="fa-solid fa-check"></i> Approve</button>
                    <button class="reject-btn"><i class="fa-solid fa-xmark"></i> Reject</button>
                </div>
            `;

            row.querySelector('.view-btn').addEventListener('click', () => openModal(id -1, requestData.name, requestData.documentType, date, requestData.address, requestData.reason));
            row.querySelector('.approve-btn').addEventListener('click', () => updateStatus(requestDoc.id, 'approved'));
            row.querySelector('.reject-btn').addEventListener('click', () => updateStatus(requestDoc.id, 'denied'));

            tableBody.appendChild(row);
        }
    }

    async function updateStatus(docId, newStatus) {
        const requestDocRef = doc(db, 'REQUESTS', docId);
        await updateDoc(requestDocRef, { 
            status: newStatus,
            reviewedBy: adminId,
            reviewedAt: serverTimestamp()
        });
        loadDocuments(); // Refresh the table
    }

    function openModal(id, name, type, date, address, reason) {
        document.getElementById('modal-title').innerText = `Details about ID ${id}`;
        document.getElementById('modal-name').innerText = name;
        document.getElementById('modal-type').innerText = type;
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
