document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-page-form');
    const loginError = document.getElementById('login-page-error');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            // Clear previous error message
            loginError.textContent = '';

            // Validate inputs
            if (!email || !password) {
                loginError.textContent = "This email doesn't associated to any course";
                return;
            }

            // Show error message for any login attempt
            loginError.textContent = "This email doesn't associated to any course";
            
            // Clear form
            loginForm.reset();
            emailInput.focus();
        });
    }
});
