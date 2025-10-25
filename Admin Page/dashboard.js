import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    const requestsTable = document.querySelector('.table-body');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
                loadDashboardData();
            } else {
                window.location.href = '../Log-Reg Page/login.html';
            }
        } else {
            window.location.href = '../Log-Reg Page/login.html';
        }
    });

    async function loadDashboardData() {
        requestsTable.innerHTML = '';

        const requestsSnapshot = await getDocs(collection(db, 'document_requests'));
        
        for (const requestDoc of requestsSnapshot.docs) {
            const requestData = requestDoc.data();
            const userDocRef = doc(db, 'users', requestData.userId);
            const userDocSnap = await getDoc(userDocRef);
            const userData = userDocSnap.data();

            const row = document.createElement('div');
            row.classList.add('table-row');

            const name = userData ? `${userData.firstName} ${userData.lastName}` : 'Unknown User';
            const date = requestData.createdAt.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

            row.innerHTML = `
                <div class="row-name">
                    <i class="fa-solid fa-circle-user"></i>
                    <span>${name}</span>
                </div>
                <div>${requestData.documentType}</div>
                <div>${date}</div>
                <div>${requestData.status}</div>
            `;

            requestsTable.appendChild(row);
        }
    }
});
