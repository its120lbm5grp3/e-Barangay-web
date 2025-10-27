// documents.js
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
	serverTimestamp,
	query,
	orderBy
}
from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
document.addEventListener('DOMContentLoaded', () => {
	const tableBody = document.querySelector('.doc-table .table-body');
	const modal = document.getElementById('modal'); // overlay element
	const logoutButton = document.querySelector('.logout-btn');
	const approveBtnModal = document.getElementById('approve-btn');
	const rejectBtnModal = document.getElementById('reject-btn');
	const saveEtaBtn = document.getElementById('save-eta-btn');
	const etaInput = document.getElementById('modal-eta');
	let adminId = null;
	if(!tableBody) console.warn('tableBody not found');
	if(!modal) {
		console.error('Modal overlay with id="modal" not found. Make sure your HTML contains <div id="modal" class="modal-overlay">');
		return;
	}

	function closeModal() {
		if(!modal.classList.contains('active')) {
			modal.style.display = '';
			return;
		}
		modal.classList.remove('active');
		const onTransitionEnd = (e) => {
			if(e.propertyName === 'opacity' || e.propertyName === 'visibility') {
				modal.style.display = '';
				modal.removeEventListener('transitionend', onTransitionEnd);
			}
		};
		modal.addEventListener('transitionend', onTransitionEnd);
	}

	function openModalOverlay() {
		modal.style.display = 'flex';
		requestAnimationFrame(() => {
			modal.classList.add('active');
		});
	}
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
	onAuthStateChanged(auth, async(user) => {
		if(user) {
			adminId = user.uid;
			const userDocRef = doc(db, 'users', user.uid);
			const userDocSnap = await getDoc(userDocRef);
			if(userDocSnap.exists() && userDocSnap.data().role === 'admin') {
				loadDocuments();
			} else {
				window.location.href = '../Log-Reg Page/login.html';
			}
		} else {
			window.location.href = '../Log-Reg Page/login.html';
		}
	});
	// Load documents sorted by createdAt DESC (newest first)
	async function loadDocuments() {
		if(!tableBody) return;
		tableBody.innerHTML = ''; // Clear only the table body
		try {
			// Query REQUESTS ordered by createdAt descending
			const q = query(collection(db, 'REQUESTS'), orderBy('createdAt', 'desc'));
			const requestsSnapshot = await getDocs(q);
			let index = 1;
			for(const requestDoc of requestsSnapshot.docs) {
				const requestData = requestDoc.data();
				// capture the numeric id for this row so event handlers close over the correct value
				const rowIndex = index;
				const row = document.createElement('div');
				row.classList.add('table-row');
				let date = '—';
				try {
					date = requestData.createdAt ? requestData.createdAt.toDate().toLocaleDateString('en-US', {
						month: 'numeric',
						day: 'numeric',
						year: 'numeric'
					}) : '—';
				} catch(err) {
					date = '—';
				}
				// show eta in its own column; use a friendly placeholder if not set
				const etaDisplay = requestData.eta ? escapeHtml(String(requestData.eta)) : '—';
				row.innerHTML = `
          <div>${rowIndex}</div>
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
				// Use the captured rowIndex so each handler shows the correct numeric id
				viewBtn ?.addEventListener('click', () => {
					openModal(requestDoc.id, rowIndex, requestData);
				});
				approveBtn ?.addEventListener('click', () => updateStatus(requestDoc.id, 'approved'));
				rejectBtn ?.addEventListener('click', () => updateStatus(requestDoc.id, 'denied'));
				tableBody.appendChild(row);
				index++;
			}
		} catch(err) {
			console.error('Error loading documents:', err);
		}
	}

	function escapeHtml(str) {
		return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
	}
	async function updateStatus(docId, newStatus) {
		try {
			if(!docId) {
				throw new Error('No document id provided to updateStatus');
			}
			const requestDocRef = doc(db, 'REQUESTS', docId);
			await updateDoc(requestDocRef, {
				status: newStatus,
				reviewedBy: adminId,
				reviewedAt: serverTimestamp()
			});
			closeModal();
			await loadDocuments();
		} catch(err) {
			console.error('Failed to update status:', err);
			alert('Failed to update status. Check console for details.');
		}
	}
	// Update ETA field on a document
	async function updateEta(docId, etaValue) {
		try {
			if(!docId) throw new Error('No document id provided to updateEta');
			const requestDocRef = doc(db, 'REQUESTS', docId);
			// store eta as string (you can change parsing/validation as needed)
			await updateDoc(requestDocRef, {
				eta: etaValue,
				updatedBy: adminId,
				updatedAt: serverTimestamp()
			});
			// refresh listing so table shows updated ETA immediately
			await loadDocuments();
		} catch(err) {
			console.error('Failed to update ETA:', err);
			alert('Failed to save ETA. Check console for details.');
		}
	}
	// simplified openModal: use the numericId passed in (rowIndex) and the passed requestData
	function openModal(firebaseDocId, numericId, requestData) {
		const idToShow = numericId ?? '—';
		const data = requestData ?? {};
		const titleEl = document.getElementById('modal-title');
		const nameEl = document.getElementById('modal-name');
		const typeEl = document.getElementById('modal-type');
		const dateEl = document.getElementById('modal-date');
		const addressEl = document.getElementById('modal-address');
		const reasonEl = document.getElementById('modal-reason');
		if(titleEl) titleEl.innerText = `Details about ID ${idToShow}`;
		if(nameEl) nameEl.innerText = data.name ?? '—';
		if(typeEl) typeEl.innerText = data.documentType ?? '—';
		let dateStr = '—';
		try {
			dateStr = data.createdAt ? data.createdAt.toDate().toLocaleDateString('en-US', {
				month: 'numeric',
				day: 'numeric',
				year: 'numeric'
			}) : '—';
		} catch(e) {
			dateStr = data.date || '—';
		}
		if(dateEl) dateEl.innerText = dateStr;
		if(addressEl) addressEl.innerText = data.address ?? '—';
		if(reasonEl) reasonEl.value = data.reason ?? '';
		// populate eta input if present
		if(etaInput) {
			etaInput.value = data.eta ?? '';
		}
		// store current firebase id for modal approve/reject/save
		modal.dataset.currentDocId = firebaseDocId;
		openModalOverlay();
	}
	document.querySelectorAll('.modal-close').forEach(btn => {
		btn.addEventListener('click', () => {
			closeModal();
		});
	});
	modal.addEventListener('click', (e) => {
		if(e.target === modal) closeModal();
	});
	if(approveBtnModal) {
		approveBtnModal.addEventListener('click', async(e) => {
			e.preventDefault();
			const docId = modal.dataset.currentDocId;
			if(!docId) {
				console.error('No currentDocId found on modal.dataset');
				alert('Unable to approve: no document selected.');
				return;
			}
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
	if(rejectBtnModal) {
		rejectBtnModal.addEventListener('click', async(e) => {
			e.preventDefault();
			const docId = modal.dataset.currentDocId;
			if(!docId) {
				console.error('No currentDocId found on modal.dataset');
				alert('Unable to reject: no document selected.');
				return;
			}
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
	if(saveEtaBtn && etaInput) {
		saveEtaBtn.addEventListener('click', async(e) => {
			e.preventDefault();
			const docId = modal.dataset.currentDocId;
			if(!docId) {
				console.error('No currentDocId found on modal.dataset');
				alert('Unable to save ETA: no document selected.');
				return;
			}
			saveEtaBtn.disabled = true;
			try {
				const etaVal = etaInput.value.trim();
				// optional: validate eta formatting here (e.g., numbers or "3 days")
				await updateEta(docId, etaVal);
				// Update modal display so admin sees saved value
				if(etaInput) etaInput.value = etaVal;
			} finally {
				saveEtaBtn.disabled = false;
			}
		});
	} else {
		console.warn('#save-eta-btn or #modal-eta not found in DOM');
	}
	console.debug('Documents page JS loaded. Modal element:', modal);
});