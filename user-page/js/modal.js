document.addEventListener("DOMContentLoaded", () => {
	// --- Data Privacy Modal ---
	const privacyModal = document.getElementById("modal");
	const privacyOkBtn = document.getElementById("modal-ok");
	const privacyLink = document.querySelector('a[href="data-privacy.html"]');
	const privacyReadMore = document.getElementById("modal-read-more");
	if(privacyLink) {
		privacyLink.addEventListener("click", (e) => {
			e.preventDefault();
			privacyModal.classList.add("active");
		});
	}
	if(privacyOkBtn) {
		privacyOkBtn.addEventListener("click", () => {
			privacyModal.classList.remove("active");
		});
	}
	if(privacyReadMore) {
		privacyReadMore.addEventListener("click", () => {
			window.open("data-privacy.html", "_blank");
		});
	}
	privacyModal ?.addEventListener("click", (e) => {
		if(e.target === privacyModal) {
			privacyModal.classList.remove("active");
		}
	});
	// --- Terms and Conditions Modal ---
	const termsModal = document.getElementById("termsModal");
	const termsOkBtn = document.getElementById("terms-ok");
	const termsLinks = document.querySelectorAll('a[href="terms-condition.html"]');
	const termsReadMore = document.getElementById("terms-read-more");
	if(termsLinks.length > 0) {
		termsLinks.forEach((link) => {
			link.addEventListener("click", (e) => {
				e.preventDefault();
				termsModal.classList.add("active");
			});
		});
	}
	if(termsOkBtn) {
		termsOkBtn.addEventListener("click", () => {
			termsModal.classList.remove("active");
		});
	}
	if(termsReadMore) {
		termsReadMore.addEventListener("click", () => {
			window.open("terms-condition.html", "_blank");
		});
	}
	termsModal ?.addEventListener("click", (e) => {
		if(e.target === termsModal) {
			termsModal.classList.remove("active");
		};
	});
});