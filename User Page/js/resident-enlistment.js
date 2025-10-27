// resident-enlistment.js
import {
	auth, db
}
from '../../firebase-config.js';
import {
	doc, getDoc, addDoc, collection, serverTimestamp
}
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
	onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
document.addEventListener('DOMContentLoaded', () => {
	const form = document.querySelector('.form');
	const firstNameField = document.getElementById('first_name');
	const lastNameField = document.getElementById('last_name');
	const addressField = document.getElementById('address');
	const contactField = document.getElementById('contact');
	const civilStatusField = document.getElementById('civil_status');
	const purposeField = document.getElementById('purpose');
	// ensure toast container exists
	let toastContainer = document.getElementById('eb-toast-container');
	if(!toastContainer) {
		toastContainer = document.createElement('div');
		toastContainer.id = 'eb-toast-container';
		toastContainer.setAttribute('aria-live', 'polite');
		toastContainer.setAttribute('aria-atomic', 'true');
		document.body.appendChild(toastContainer);
	}
	// helper to escape user text
	function escapeHtml(str) {
		if(str === null || str === undefined) return '';
		return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
	}
	// showToast(type, title, message, timeoutMs)
	function showToast(type = 'info', title = '', message = '', timeoutMs = 4200) {
		const container = document.getElementById('eb-toast-container');
		if(!container) return;
		const item = document.createElement('div');
		item.className = `eb-toast ${type}`;
		item.innerHTML = `
            <div class="eb-body">
                <h4>${escapeHtml(title)}</h4>
                <p>${escapeHtml(message)}</p>
            </div>
            <button type="button" class="eb-close" aria-label="Close toast">×</button>
        `;
		container.appendChild(item);
		// show animation
		requestAnimationFrame(() => item.classList.add('eb-show'));
		// close handler
		const closeBtn = item.querySelector('.eb-close');
		const remove = () => {
			item.classList.remove('eb-show');
			setTimeout(() => {
				if(item.parentNode) item.parentNode.removeChild(item);
			}, 380);
		};
		closeBtn.addEventListener('click', remove);
		// auto remove after timeout
		const timer = setTimeout(remove, timeoutMs);
		// ensure timer cleared on manual close
		closeBtn.addEventListener('click', () => clearTimeout(timer));
	}
	// modal helpers (unchanged)
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
	if(modalOkButton) modalOkButton.addEventListener('click', hideModal);
	// populate user info
	onAuthStateChanged(auth, async(user) => {
		if(user) {
			const userDocRef = doc(db, 'users', user.uid);
			try {
				const userDocSnap = await getDoc(userDocRef);
				if(userDocSnap.exists()) {
					const userData = userDocSnap.data();
					firstNameField.value = userData.firstName || '';
					lastNameField.value = userData.lastName || '';
					if(userData.address) {
						addressField.value = `${userData.address.blkNo || ''} ${userData.address.street || ''}, ${userData.address.town || ''}, ${userData.address.city || ''}, ${userData.address.zip || ''}`.trim();
					}
				} else {
					window.location.href = '../Log-Reg Page/login.html';
				}
			} catch(err) {
				console.error('Error fetching user doc', err);
			}
		}
	});
	// submit handler
	form.addEventListener('submit', async(e) => {
		e.preventDefault();
		const user = auth.currentUser;
		if(!user) {
			// toast instead of modal for inline feedback
			showToast('error', 'Login required', 'You must be logged in to submit a request.');
			return;
		}
		if(!purposeField.value) {
			showToast('error', 'Missing field', 'Please select a purpose for registration.');
			return;
		}
		try {
			await addDoc(collection(db, 'ENLISTMENTS'), {
				userId: user.uid,
				name: `${firstNameField.value} ${lastNameField.value}`.trim(),
				civilStatus: civilStatusField.value,
				address: addressField.value,
				contactNumber: contactField.value,
				purposeOfRegistration: purposeField.value,
				status: 'pending',
				createdAt: serverTimestamp()
			});
			showToast('success', 'Request submitted', 'Your enlistment request has been submitted.');
			form.reset();
		} catch(error) {
			console.error('Error submitting enlistment request:', error);
			showToast('error', 'Submission failed', 'An error occurred while submitting your request. Please try again.');
		}
	});
});