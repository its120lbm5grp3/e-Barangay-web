import { auth, db, rtdb } from '../firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

document.addEventListener('DOMContentLoaded', () => {

    const onlineUsersCount = document.getElementById('online-users-count');
    const pendingDocsCard = document.querySelector('.card.docs .card-number');
    const acceptedDocsCard = document.querySelector('.card.docs .card-subtitle + .card-number');
    const pendingEnlistsCard = document.querySelector('.card.enlist .card-number');
    const acceptedEnlistsCard = document.querySelector('.card.enlist .card-subtitle + .card-number');
    const activitiesTableBody = document.querySelector('.activities-table .table-body');
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
                loadDashboardData();
                listenForOnlineUsers();
            } else {
                window.location.href = '../Log-Reg Page/login.html';
            }
        } else {
            window.location.href = '../Log-Reg Page/login.html';
        }
    });

    function listenForOnlineUsers() {
        const statusRef = ref(rtdb, 'status');
        onValue(statusRef, (snapshot) => {
            let onlineCount = 0;
            if (snapshot.exists()) {
                const statuses = snapshot.val();
                for (const uid in statuses) {
                    if (statuses[uid].isOnline) {
                        onlineCount++;
                    }
                }
            }
            if (onlineUsersCount) {
                onlineUsersCount.textContent = onlineCount;
            }
        });
    }

    async function loadDashboardData() {
        // Optimized to fetch data once
        const requestsQuery = query(collection(db, 'REQUESTS'), orderBy('createdAt', 'desc'));
        const enlistmentsQuery = query(collection(db, 'ENLISTMENTS'), orderBy('createdAt', 'desc'));

        const [requestsSnapshot, enlistmentsSnapshot] = await Promise.all([
            getDocs(requestsQuery),
            getDocs(enlistmentsQuery)
        ]);

        let pendingDocs = 0;
        let approvedDocs = 0;
        let allActivities = [];

        requestsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'pending') pendingDocs++;
            if (data.status === 'approved') approvedDocs++;
            allActivities.push({ ...data, type: data.documentType, timestamp: data.createdAt });
        });

        let pendingEnlists = 0;
        let approvedEnlists = 0;
        enlistmentsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'pending') pendingEnlists++;
            if (data.status === 'approved') approvedEnlists++;
            allActivities.push({ ...data, type: 'Resident Enlistment', timestamp: data.createdAt });
        });

        // Update stat cards
        pendingDocsCard.textContent = pendingDocs;
        acceptedDocsCard.textContent = approvedDocs;
        pendingEnlistsCard.textContent = pendingEnlists;
        acceptedEnlistsCard.textContent = approvedEnlists;

        // Sort all activities together
        allActivities.sort((a, b) => b.timestamp - a.timestamp);

        // Display recent activities
        activitiesTableBody.innerHTML = ''; 
        allActivities.slice(0, 10).forEach(activity => {
            const row = document.createElement('div');
            row.classList.add('table-row');
            
            // Robustness Fix: Handle potentially missing data
            const date = activity.timestamp ? activity.timestamp.toDate().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'No date';
            const status = activity.status || 'unknown';
            const name = activity.name || 'Unknown User';
            const type = activity.type || 'Unknown Request';

            row.innerHTML = `
                <div>${name}</div>
                <div>${type}</div>
                <div>${date}</div>
                <div class="status-${status.toLowerCase()}">${status}</div>
            `;
            activitiesTableBody.appendChild(row);
        });
    }
});
