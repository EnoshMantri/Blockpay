// ========================
// BlockPay — KYC JS
// ========================

function nextKycStep(step) {
  // Validate step 1
  if (step === 2) {
    const first = document.getElementById('kycFirst')?.value;
    const last = document.getElementById('kycLast')?.value;
    const dob = document.getElementById('kycDob')?.value;
    const nat = document.getElementById('kycNat')?.value;
    const addr = document.getElementById('kycAddr')?.value;
    const phone = document.getElementById('kycPhone')?.value;
    const email = document.getElementById('kycEmail')?.value;

    if (!first || !last) { alert('Please enter your full name.'); return; }
    if (!dob) { alert('Please enter your date of birth.'); return; }
    if (!nat) { alert('Please select your nationality.'); return; }
    if (!addr) { alert('Please enter your address.'); return; }
    if (!phone) { alert('Please enter your phone number.'); return; }
    if (!email || !email.includes('@')) { alert('Please enter a valid email.'); return; }
  }

  // Validate step 2
  if (step === 3) {
    const docType = document.getElementById('docType')?.value;
    if (!docType) { alert('Please select document type.'); return; }

    // Simulate processing then verified
    setTimeout(() => {
      document.querySelector('.hex-spinner').style.display = 'none';
      document.getElementById('kycVerifyTitle').textContent = '✓ Verification Complete';
      document.getElementById('kycVerifyText').style.display = 'none';
      document.getElementById('kycVerified').classList.remove('hidden');

      // Update step indicator
      ['kycStepVerify'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.add('complete');
          el.classList.remove('active');
          const icon = el.querySelector('.kyc-step-icon');
          if (icon) icon.textContent = '✓';
        }
      });
      document.getElementById('kycLine3')?.classList.add('complete');
    }, 2500);
  }

  // Hide current, show next
  document.querySelectorAll('.kyc-step-form').forEach(f => f.classList.add('hidden'));
  document.getElementById(`kycForm${step}`)?.classList.remove('hidden');

  // Update stepper
  updateKycStepper(step);
}

function updateKycStepper(step) {
  const stepIds = ['kycStepPersonal', 'kycStepDoc', 'kycStepVerify'];
  const lineIds = ['kycLine2', 'kycLine3'];

  stepIds.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('active', 'complete');
    if (i + 2 < step) {
      el.classList.add('complete');
      const icon = el.querySelector('.kyc-step-icon');
      if (icon) icon.textContent = '✓';
    } else if (i + 2 === step) {
      el.classList.add('active');
    }
  });

  lineIds.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (step > i + 2) el.classList.add('complete');
  });
}

function handleFileUpload(input) {
  if (input.files && input.files[0]) {
    const fileName = input.files[0].name;
    document.getElementById('uploadZone').style.display = 'none';
    const preview = document.getElementById('uploadPreview');
    preview.classList.remove('hidden');
    document.getElementById('previewFileName').textContent = fileName;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize first KYC step active
  document.getElementById('kycStepPersonal')?.classList.add('active');
});
