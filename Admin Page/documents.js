import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('.doc-table .table-body');
    const modal = document.getElementById('modal'); // overlay element
    const logoutButton = document.querySelector('.logout-btn');
    const approveBtnModal = document.getElementById('approve-btn');
    const rejectBtnModal = document.getElementById('reject-btn');
    let adminId = null;

    if (!tableBody) console.warn('tableBody not found');
    if (!modal) {
        console.error('Modal overlay with id="modal" not found. Make sure your HTML contains <div id="modal" class="modal-overlay">');
        return; // stop early so we don't throw errors later
    }

    // Utility: close modal (removes active class then clears display after transition)
    function closeModal() {
        if (!modal.classList.contains('active')) {
            modal.style.display = '';
            return;
        }

        modal.classList.remove('active');

        const onTransitionEnd = (e) => {
            if (e.propertyName === 'opacity' || e.propertyName === 'visibility') {
                modal.style.display = '';
                modal.removeEventListener('transitionend', onTransitionEnd);
            }
        };
        modal.addEventListener('transitionend', onTransitionEnd);
    }

    // Utility: open modal (ensures display is set before adding .active so CSS transitions run)
    function openModalOverlay() {
        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
    }

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

    // Auth state listener
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

    // Load document requests
    async function loadDocuments() {
        if (!tableBody) return;
        tableBody.innerHTML = ''; // Clear only the table body

        try {
            const requestsSnapshot = await getDocs(collection(db, 'REQUESTS'));
            let id = 1;

            for (const requestDoc of requestsSnapshot.docs) {
                const requestData = requestDoc.data();

                const row = document.createElement('div');
                row.classList.add('table-row');

                let date = '';
                try {
                    date = requestData.createdAt
                        ? requestData.createdAt.toDate().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
                        : '—';
                } catch (err) {
                    date = '—';
                }

                row.innerHTML = `
                    <div>${id++}</div>
                    <div>${escapeHtml(requestData.name || '—')}</div>
                    <div>${escapeHtml(requestData.documentType || '—')}</div>
                    <div>${date}</div>
                    <div class="status-${(requestData.status || 'pending').toLowerCase()}">${escapeHtml(requestData.status || 'pending')}</div>
                    <div class="actions">
                        <button class="view-btn"><i class="fa-solid fa-eye"></i> View</button>
                        <button class="approve-btn"><i class="fa-solid fa-check"></i> Approve</button>
                        <button class="reject-btn"><i class="fa-solid fa-xmark"></i> Reject</button>
                    </div>
                `;

                const viewBtn = row.querySelector('.view-btn');
                const approveBtn = row.querySelector('.approve-btn');
                const rejectBtn = row.querySelector('.reject-btn');

                // When clicking view: open modal and store firebase doc id on overlay dataset
                viewBtn?.addEventListener('click', () => {
                    openModal(requestDoc.id, id - 1, requestData);
                });

                // Table-level approve/reject (keeps previous behavior)
                approveBtn?.addEventListener('click', () => updateStatus(requestDoc.id, 'approved'));
                rejectBtn?.addEventListener('click', () => updateStatus(requestDoc.id, 'denied'));

                tableBody.appendChild(row);
            }
        } catch (err) {
            console.error('Error loading documents:', err);
        }
    }

    // small helper to escape content inserted into innerHTML
    function escapeHtml(str) {
        return String(str)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    // Update request status
    async function updateStatus(docId, newStatus) {
        try {
            if (!docId) {
                throw new Error('No document id provided to updateStatus');
            }
            const requestDocRef = doc(db, 'REQUESTS', docId);
            await updateDoc(requestDocRef, {
                status: newStatus,
                reviewedBy: adminId,
                reviewedAt: serverTimestamp()
            });
            // After updating close modal (if open) and refresh table
            closeModal();
            await loadDocuments();
        } catch (err) {
            console.error('Failed to update status:', err);
            alert('Failed to update status. Check console for details.');
        }
    }

    // Open modal and populate content
    function openModal(firebaseDocId, numericId, requestData) {
        let idToShow = numericId;
        let data = requestData;
        if (typeof data === 'undefined' && firebaseDocId && numericId && numericId.name) {
            data = firebaseDocId;
            idToShow = numericId;
        }

        document.getElementById('modal-title').innerText = `Details about ID ${idToShow || '—'}`;
        document.getElementById('modal-name').innerText = data?.name ?? '—';
        document.getElementById('modal-type').innerText = data?.documentType ?? '—';

        let dateStr = '—';
        try {
            dateStr = data?.createdAt ? data.createdAt.toDate().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : '—';
        } catch (e) {
            dateStr = data?.date || '—';
        }

        document.getElementById('modal-date').innerText = dateStr;
        document.getElementById('modal-address').innerText = data?.address ?? '—';
        const reasonEl = document.getElementById('modal-reason');
        if (reasonEl) reasonEl.value = data?.reason ?? '';

        // store currently opened doc id on modal dataset so approve/reject inside modal can use it
        modal.dataset.currentDocId = firebaseDocId;

        // show overlay and animate
        openModalOverlay();
    }

    // wire close buttons (both top X and footer Close)
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal();
        });
    });

    // close when clicking outside the modal-container
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // ===== NEW: modal approve/reject button handlers =====
    if (approveBtnModal) {
        approveBtnModal.addEventListener('click', async (e) => {
            e.preventDefault();
            const docId = modal.dataset.currentDocId;
            if (!docId) {
                console.error('No currentDocId found on modal.dataset');
                alert('Unable to approve: no document selected.');
                return;
            }
            // disable buttons while updating
            approveBtnModal.disabled = true;
            rejectBtnModal && (rejectBtnModal.disabled = true);
            try {
                await updateStatus(docId, 'approved');
            } finally {
                approveBtnModal.disabled = false;
                rejectBtnModal && (rejectBtnModal.disabled = false);
            }
        });
    } else {
        console.warn('#approve-btn not found in DOM');
    }

    if (rejectBtnModal) {
        rejectBtnModal.addEventListener('click', async (e) => {
            e.preventDefault();
            const docId = modal.dataset.currentDocId;
            if (!docId) {
                console.error('No currentDocId found on modal.dataset');
                alert('Unable to reject: no document selected.');
                return;
            }
            // disable buttons while updating
            rejectBtnModal.disabled = true;
            approveBtnModal && (approveBtnModal.disabled = true);
            try {
                await updateStatus(docId, 'denied');
            } finally {
                rejectBtnModal.disabled = false;
                approveBtnModal && (approveBtnModal.disabled = false);
            }
        });
    } else {
        console.warn('#reject-btn not found in DOM');
    }

    // debug helper
    console.debug('Documents page JS loaded. Modal element:', modal);
});
