import {
	auth, db
}
from '../../firebase-config.js';
import {
	onAuthStateChanged, signOut
}
from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
	collection,
	getDocs,
	doc,
	getDoc,
	updateDoc,
	serverTimestamp
}
from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
document.addEventListener('DOMContentLoaded', () => {
	const tableBody = document.querySelector('.doc-table .table-body');
	const logoutButton = document.querySelector('.logout-btn');
	// Ensure modal is found even if ID differs
	const modal = document.getElementById('detailsModal') || document.getElementById('modal') || document.querySelector('.modal-overlay');
	if(!tableBody) console.warn('tableBody not found: .doc-table .table-body');
	if(!modal) {
		console.error('Modal overlay not found.');
		return;
	}
	const modalApprove = document.getElementById('approve-btn') || modal.querySelector('.approve-btn');
	const modalReject = document.getElementById('reject-btn') || modal.querySelector('.reject-btn');
	const modalCloseButtons = Array.from(modal.querySelectorAll('.modal-close, .close-btn'));
	// NEW references
	const saveEtaBtn = document.getElementById('save-eta-btn') || modal.querySelector('#save-eta-btn');
	const etaInput = document.getElementById('modal-eta') || modal.querySelector('#modal-eta');
	// --- Modal open/close animations ---
	function openModalOverlay() {
		modal.style.display = 'flex';
		requestAnimationFrame(() => modal.classList.add('active'));
	}

	function closeModal() {
		modal.classList.remove('active');
		const onTransitionEnd = (e) => {
			if(e.propertyName === 'opacity' || e.propertyName === 'visibility') {
				modal.style.display = '';
				modal.removeEventListener('transitionend', onTransitionEnd);
			}
		};
		modal.addEventListener('transitionend', onTransitionEnd);
	}
	window.closeModal = closeModal;
	modal.addEventListener('click', (e) => {
		if(e.target === modal) closeModal();
	});
	modalCloseButtons.forEach((btn) => btn.addEventListener('click', closeModal));
	// --- Logout functionality ---
	if(logoutButton) {
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
	// --- Firebase Authentication ---
	let adminId = null;
	onAuthStateChanged(auth, async(user) => {
		if(user) {
			adminId = user.uid;
			const userDocRef = doc(db, 'users', user.uid);
			const userDocSnap = await getDoc(userDocRef);
			if(userDocSnap.exists() && userDocSnap.data().role === 'admin') {
				loadEnlistments();
			} else {
				window.location.href = '../Log-Reg Page/login.html';
			}
		} else {
			window.location.href = '../Log-Reg Page/login.html';
		}
	});
	// --- Load Enlistments Data ---
	async function loadEnlistments() {
		if(!tableBody) return;
		tableBody.innerHTML = '';
		try {
			const snapshot = await getDocs(collection(db, 'ENLISTMENTS'));
			let id = 1;
			for(const docSnap of snapshot.docs) {
				const data = docSnap.data();
				const row = document.createElement('div');
				row.classList.add('table-row');
				let date = '—';
				try {
					date = data.createdAt ? data.createdAt.toDate().toLocaleDateString('en-US', {
						month: 'numeric',
						day: 'numeric',
						year: 'numeric',
					}) : '—';
				} catch(err) {
					date = '—';
				}
				const etaDisplay = data.eta ? escapeHtml(String(data.eta)) : '—';
				row.innerHTML = `
          <div>${id++}</div>
          <div>${escapeHtml(data.name ?? '—')}</div>
          <div>${escapeHtml(data.purposeOfRegistration ?? '—')}</div>
          <div>${date}</div>
          <div class="status-${(data.status ?? 'pending').toLowerCase()}">
            ${escapeHtml(data.status ?? 'pending')}
          </div>
          <div class="actions">
            <button class="view-btn"><i class="fa-solid fa-eye"></i> View</button>
            <button class="approve-btn"><i class="fa-solid fa-check"></i> Approve</button>
            <button class="reject-btn"><i class="fa-solid fa-xmark"></i> Reject</button>
          </div>
        `;
				const viewBtn = row.querySelector('.view-btn');
				const approveBtn = row.querySelector('.approve-btn');
				const rejectBtn = row.querySelector('.reject-btn');
				viewBtn ?.addEventListener('click', () => openModal(docSnap.id, id - 1, data));
				approveBtn ?.addEventListener('click', () => updateStatus(docSnap.id, 'approved'));
				rejectBtn ?.addEventListener('click', () => updateStatus(docSnap.id, 'denied'));
				tableBody.appendChild(row);
			}
		} catch(err) {
			console.error('Error loading enlistments:', err);
		}
	}
	// --- Helper: Escape HTML ---
	function escapeHtml(str) {
		return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
	}
	// --- Update Firestore Status ---
	async function updateStatus(docId, newStatus) {
		try {
			const ref = doc(db, 'ENLISTMENTS', docId);
			await updateDoc(ref, {
				status: newStatus,
				reviewedBy: adminId,
				reviewedAt: serverTimestamp()
			});
			closeModal();
			await loadEnlistments();
		} catch(err) {
			console.error('Failed to update status:', err);
			alert('Failed to update status. See console.');
		}
	}
	// --- Update ETA ---
	async function updateEta(docId, etaValue) {
		try {
			const ref = doc(db, 'ENLISTMENTS', docId);
			await updateDoc(ref, {
				eta: etaValue,
				updatedBy: adminId,
				updatedAt: serverTimestamp()
			});
			// refresh list to show new ETA
			await loadEnlistments();
		} catch(err) {
			console.error('Failed to update ETA:', err);
			alert('Failed to save ETA. See console.');
		}
	}
	// --- Open Modal with Updated Fields ---
	function openModal(firebaseDocId, numericId, requestData) {
		const safeSet = (id, value) => {
			const el = document.getElementById(id);
			if(el) el.innerText = value ?? '—';
		};
		safeSet('modal-title', `Details about ID ${numericId ?? '—'}`);
		safeSet('modal-name', requestData ?.name ?? '—');
		safeSet('modal-type', requestData ?.civilStatus ?? '—');
		safeSet('modal-address', requestData ?.address ?? '—');
		safeSet('modal-contact', requestData ?.contactNumber ?? '—');
		safeSet('modal-purpose', requestData ?.purposeOfRegistration ?? '—');
		let dateStr = '—';
		try {
			dateStr = requestData ?.createdAt ? requestData.createdAt.toDate().toLocaleDateString('en-US', {
				month: 'numeric',
				day: 'numeric',
				year: 'numeric',
			}) : '—';
		} catch {
			dateStr = requestData ?.date || '—';
		}
		safeSet('modal-date', dateStr);
		// populate eta input if present
		if(etaInput) {
			etaInput.value = requestData ?.eta ?? '';
		} else {
			console.warn('#modal-eta not found in DOM');
		}
		modal.dataset.currentDocId = firebaseDocId;
		openModalOverlay();
	}
	// --- Approve / Reject Buttons ---
	if(modalApprove) {
		modalApprove.addEventListener('click', async(e) => {
			e.preventDefault();
			const id = modal.dataset.currentDocId;
			if(!id) return alert('No document selected.');
			modalApprove.disabled = true;
			if(modalReject) modalReject.disabled = true;
			try {
				await updateStatus(id, 'approved');
			} finally {
				modalApprove.disabled = false;
				if(modalReject) modalReject.disabled = false;
			}
		});
	}
	if(modalReject) {
		modalReject.addEventListener('click', async(e) => {
			e.preventDefault();
			const id = modal.dataset.currentDocId;
			if(!id) return alert('No document selected.');
			modalReject.disabled = true;
			if(modalApprove) modalApprove.disabled = true;
			try {
				await updateStatus(id, 'denied');
			} finally {
				modalReject.disabled = false;
				if(modalApprove) modalApprove.disabled = false;
			}
		});
	}
	// --- Save ETA Button Listener ---
	if(saveEtaBtn && etaInput) {
		saveEtaBtn.addEventListener('click', async(e) => {
			e.preventDefault();
			const id = modal.dataset.currentDocId;
			if(!id) {
				alert('No document selected.');
				return;
			}
			saveEtaBtn.disabled = true;
			try {
				const etaVal = etaInput.value.trim();
				await updateEta(id, etaVal);
			} finally {
				saveEtaBtn.disabled = false;
			}
		});
	} else {
		console.warn('#save-eta-btn or #modal-eta not found in DOM');
	}
});