/**
 * Future Institute of Commerce - Client-Side Interactive Form Controller
 * Implements Option 1 (AJAX Submissions) and Option 2 (Input Validation & Loaders)
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. Contact Form Controller
    // ==========================================
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Clear previous alerts and custom validation outlines
            clearFormStates(contactForm);
            
            // Retrieve Form Fields
            const nameField = document.getElementById('name');
            const fnameField = document.getElementById('fname');
            const emailField = document.getElementById('email');
            const phoneField = document.getElementById('phone');
            const subjectField = document.getElementById('subject');
            const messageField = document.getElementById('message');
            
            let isValid = true;
            const errors = [];
            
            // Validation Logic
            if (!nameField.value.trim()) {
                markInvalid(nameField);
                errors.push("Your Name is required.");
                isValid = false;
            }
            
            if (!fnameField.value.trim()) {
                markInvalid(fnameField);
                errors.push("Father's Name is required.");
                isValid = false;
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailField.value.trim() || !emailRegex.test(emailField.value.trim())) {
                markInvalid(emailField);
                errors.push("Please enter a valid email address.");
                isValid = false;
            }
            
            const phoneRegex = /^\d{10}$/;
            const sanitizedPhone = phoneField.value.replace(/[\s-()]/g, '');
            if (!sanitizedPhone || !phoneRegex.test(sanitizedPhone)) {
                markInvalid(phoneField);
                errors.push("Phone Number must contain exactly 10 numeric digits.");
                isValid = false;
            }
            
            if (!subjectField.value) {
                markInvalid(subjectField);
                errors.push("Please select a course you are interested in.");
                isValid = false;
            }
            
            if (!messageField.value.trim()) {
                markInvalid(messageField);
                errors.push("Message body cannot be empty.");
                isValid = false;
            }
            
            // If invalid, show validation feedback banner and return
            if (!isValid) {
                showFormAlert(contactForm, 'warning', errors.join('<br>'));
                return;
            }
            
            // Prep Payload
            const payload = {
                name: nameField.value.trim(),
                fname: fnameField.value.trim(),
                email: emailField.value.trim(),
                phone: sanitizedPhone,
                subject: subjectField.value,
                message: messageField.value.trim()
            };
            
            // Set Submit Loader State
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnHtml = submitBtn.innerHTML;
            setButtonLoading(submitBtn, 'Sending Message...');
            
            try {
                const response = await fetch('/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    showFormAlert(contactForm, 'success', `<i class="fa-solid fa-circle-check me-2"></i> ${result.message}`);
                    contactForm.reset();
                } else {
                    throw new Error(result.error || 'Failed to submit enquiry. Please try again.');
                }
            } catch (err) {
                showFormAlert(contactForm, 'danger', `<i class="fa-solid fa-triangle-exclamation me-2"></i> ${err.message}`);
            } finally {
                // Restore button state
                restoreButtonState(submitBtn, originalBtnHtml);
            }
        });
    }
    
    // ==========================================
    // 2. Payment Form Controller
    // ==========================================
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            clearFormStates(paymentForm);
            
            const studentNameField = document.getElementById('studentName');
            const classField = document.getElementById('class');
            const fatherNameField = document.getElementById('fatherName');
            const courseField = document.getElementById('course');
            const amountField = document.getElementById('amount');
            
            let isValid = true;
            const errors = [];
            
            // Validation Logic
            if (!studentNameField.value.trim()) {
                markInvalid(studentNameField);
                errors.push("Student Name is required.");
                isValid = false;
            }
            
            if (!classField.value.trim()) {
                markInvalid(classField);
                errors.push("Class/Grade is required.");
                isValid = false;
            }
            
            if (!fatherNameField.value.trim()) {
                markInvalid(fatherNameField);
                errors.push("Father's Name is required.");
                isValid = false;
            }
            
            if (!courseField.value) {
                markInvalid(courseField);
                errors.push("Please select your course.");
                isValid = false;
            }
            
            const amountVal = parseFloat(amountField.value);
            if (isNaN(amountVal) || amountVal < 500) {
                markInvalid(amountField);
                errors.push("Fee payment amount must be at least ₹500.");
                isValid = false;
            }
            
            if (!isValid) {
                showFormAlert(paymentForm, 'warning', errors.join('<br>'));
                return;
            }
            
            const payload = {
                studentName: studentNameField.value.trim(),
                class: classField.value.trim(),
                fatherName: fatherNameField.value.trim(),
                course: courseField.value,
                amount: amountVal
            };
            
            const submitBtn = paymentForm.querySelector('button[type="submit"]');
            const originalBtnHtml = submitBtn.innerHTML;
            setButtonLoading(submitBtn, 'Saving details...');
            
            try {
                const response = await fetch('/payfees', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    showFormAlert(paymentForm, 'success', `<i class="fa-solid fa-circle-check me-2"></i> ${result.message}`);
                    paymentForm.reset();
                } else {
                    throw new Error(result.error || 'Failed to complete payment entry.');
                }
            } catch (err) {
                showFormAlert(paymentForm, 'danger', `<i class="fa-solid fa-triangle-exclamation me-2"></i> ${err.message}`);
            } finally {
                restoreButtonState(submitBtn, originalBtnHtml);
            }
        });
    }
    
    // ==========================================
    // Helpers
    // ==========================================
    
    function markInvalid(element) {
        element.classList.add('is-invalid');
        element.style.borderColor = '#dc3545';
        element.style.boxShadow = '0 0 0 4px rgba(220, 53, 69, 0.15)';
        
        // Clear warning on input/focus
        element.addEventListener('focus', function clearOutline() {
            element.classList.remove('is-invalid');
            element.style.borderColor = '';
            element.style.boxShadow = '';
            element.removeEventListener('focus', clearOutline);
        });
    }
    
    function clearFormStates(form) {
        // Clear previous error styles
        const inputs = form.querySelectorAll('.form-input-custom');
        inputs.forEach(input => {
            input.classList.remove('is-invalid');
            input.style.borderColor = '';
            input.style.boxShadow = '';
        });
        
        // Remove existing alert container
        const alert = form.querySelector('.dynamic-form-alert');
        if (alert) {
            alert.remove();
        }
    }
    
    function showFormAlert(form, type, htmlMessage) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} dynamic-form-alert animate__animated animate__fadeIn mb-4`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = htmlMessage;
        
        // Add styling for alerts within our custom aesthetics
        alertDiv.style.borderRadius = '8px';
        alertDiv.style.fontSize = '0.92rem';
        alertDiv.style.fontWeight = '500';
        alertDiv.style.border = 'none';
        
        if (type === 'warning') {
            alertDiv.style.backgroundColor = 'rgba(255, 193, 7, 0.15)';
            alertDiv.style.color = '#856404';
        } else if (type === 'success') {
            alertDiv.style.backgroundColor = 'rgba(40, 167, 69, 0.15)';
            alertDiv.style.color = '#155724';
        } else if (type === 'danger') {
            alertDiv.style.backgroundColor = 'rgba(220, 53, 69, 0.15)';
            alertDiv.style.color = '#721c24';
        }
        
        // Insert alert at the top of the form
        form.insertBefore(alertDiv, form.firstChild);
        
        // Scroll to form top if it's the large contact form
        if (form.id === 'contactForm') {
            form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    function setButtonLoading(button, text) {
        button.disabled = true;
        button.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin me-2"></i> ${text}`;
    }
    
    function restoreButtonState(button, originalHtml) {
        button.disabled = false;
        button.innerHTML = originalHtml;
    }
});
