// === Fetch Main Balance ===
function fetchBalance() {
  fetch("/get-balance", { credentials: "include" })
    .then((res) => {
      if (!res.ok) throw new Error("Session expired or user not logged in");
      return res.json();
    })
    .then((data) => {
      const balanceElement = document.getElementById("balance-container");
      if (balanceElement) {
        balanceElement.innerText = `₦${parseFloat(data.balance).toFixed(2)}`;
      }

      const profileBalance = document.getElementById("profile-balance-display");
      if (profileBalance) {
        profileBalance.innerText = `₦${parseFloat(data.balance).toFixed(2)}`;
      }
    })
    .catch((err) => console.error("Error fetching balance:", err));
}

// === Fetch Referral Info ===
function fetchReferralData() {
  fetch("/get-referral-balance", { credentials: "include" })
    .then((res) => {
      if (!res.ok) throw new Error("Session expired or unauthorized");
      return res.json();
    })
    .then((data) => {
      const referralCodeEl = document.getElementById("referral-code");
      if (referralCodeEl) referralCodeEl.innerText = data.referralCode || "N/A";

      const referralBalanceEl = document.getElementById("referral-balance");
      if (referralBalanceEl)
        referralBalanceEl.innerText = `₦${parseFloat(
          data.referralBalance
        ).toFixed(2)}`;

      const referralInput = document.getElementById("copyInput");
      if (referralInput && data.referralCode) {
        referralInput.value = `http://localhost:5000/signup/${data.referralCode}`;
      }

      const referredList = document.getElementById("referred-users");
      if (referredList) {
        referredList.innerHTML = "";

        if (data.referred.length === 0) {
          referredList.innerHTML =
            '<p class="text-muted">No referred users yet.</p>';
        } else {
          data.referred.forEach((user) => {
            const div = document.createElement("div");
            div.className = "referred-user border-bottom py-2 text-white";
            div.innerHTML = `<strong>${user.name}</strong><br/><small>${user.email}</small>`;
            referredList.appendChild(div);
          });
        }
      }
    })
    .catch((err) => console.error("Failed to fetch referral data:", err));
}

// === Withdraw Referral Balance ===
function withdrawReferral() {
  fetch("/withdraw-referral-balance", {
    method: "POST",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      alert(data.message);
      fetchBalance();
      fetchReferralData();
    })
    .catch((err) => console.error("Withdrawal failed:", err));
}

// === Register and Login Forms + Autofill Referral Code ===
document.addEventListener("DOMContentLoaded", () => {
  const segments = window.location.pathname.split("/");
  if (segments.length === 3 && segments[1] === "signup") {
    const refCode = decodeURIComponent(segments[2]);
    const referralInput = document.getElementById("referralCode");
    if (referralInput) referralInput.value = refCode;
  }

  const signUpForm = document.querySelector("#sign-up form");
  if (signUpForm) {
    signUpForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const fullname = document.getElementById("fullname");
      const email = document.getElementById("email");
      const password = document.getElementById("password");
      const confirmPassword = document.getElementById("confirmPassword");
      const referralCode = document.getElementById("referralCode");

      if (!fullname.value.trim()) return alert("Full name is required.");
      if (!validateEmail(email.value))
        return alert("Please enter a valid email address.");
      if (password.value.length < 6)
        return alert("Password must be at least 6 characters.");
      if (password.value !== confirmPassword.value)
        return alert("Passwords do not match.");

      fetch("/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          fullname: fullname.value,
          email: email.value,
          password: password.value,
          confirmPassword: confirmPassword.value,
          referralCode: referralCode?.value || "",
        }),
      })
        .then((res) => {
          if (res.redirected) {
            window.location.href = res.url;
          } else {
            return res
              .json()
              .then((data) => alert(data.message || "Signup failed"));
          }
        })
        .catch((err) => console.error("Registration failed:", err));
    });
  }

  const loginForm = document.querySelector("#login form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const email = document.getElementById("email");
      const password = document.getElementById("password");

      if (!validateEmail(email.value))
        return alert("Please enter a valid email address.");
      if (password.value.length < 6)
        return alert("Password must be at least 6 characters.");

      fetch("/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email: email.value,
          password: password.value,
        }),
      })
        .then((res) => {
          if (res.redirected) {
            window.location.href = res.url;
          } else {
            return res.text().then((msg) => alert(msg || "Login failed"));
          }
        })
        .catch((err) => console.error("Login failed:", err));
    });
  }

  fetchBalance();
  fetchReferralData();
  loadUserProfile();
});

// === Utilities ===
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.toLowerCase());
}

function addEarnings(amount, taskId) {
  fetch(`/do-task/${taskId}/${amount}`, {
    method: "POST",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      alert(data.message || "Task processed.");
      fetchBalance();
      fetchTodayStats(); // Update dashboard stats after task
    })
    .catch((err) => console.error("Task error:", err));
}

// === UI Functions ===
function liveStream() {
  document
    .querySelectorAll(".task_body")
    .forEach((t) => (t.style.display = "none"));
  document.getElementById("join_live").style.display = "block";
  document.getElementById("live_button").style.borderBottom = "3px solid gold";
  document.getElementById("task_button").style.borderBottom = "none";
}

function performTasks() {
  document.getElementById("join_live").style.display = "none";
  document
    .querySelectorAll(".task_body")
    .forEach((t) => (t.style.display = "block"));
  document.getElementById("live_button").style.borderBottom = "none";
  document.getElementById("task_button").style.borderBottom = "3px solid gold";
}

function line_rows_show() {
  document
    .querySelectorAll(".profile_row")
    .forEach((row) => (row.style.display = "flex"));
}

function line_rows_hide() {
  document
    .querySelectorAll(".profile_row")
    .forEach((row) => (row.style.display = "none"));
}

function profile_details() {
  line_rows_hide();
  document.getElementById("profile_details").style.display = "flex";
}
function password_settings() {
  line_rows_hide();
  document.getElementById("password_settings").style.display = "flex";
}
function Notification_settings() {
  line_rows_hide();
  document.getElementById("Notification_settings").style.display = "flex";
}
function About_project() {
  line_rows_hide();
  document.getElementById("About_project").style.display = "flex";
}
function Help_Faq() {
  line_rows_hide();
  document.getElementById("Help_Faq").style.display = "flex";
}
function confirm() {
  line_rows_hide();
  document.getElementById("Close_account").style.display = "flex";
}

function Close_account() {
  line_rows_hide();
  document.getElementById("Close_account").style.display = "none";
  document.getElementById("closed").style.display = "flex";
  document.getElementById("settings").style.display = "none";
  document.getElementById("settings2").style.display = "none";
  document.getElementById("Dashboard4").style.display = "none";
}

function back() {
  document.getElementById("closed").style.display = "none";
  document.getElementById("Close_account").style.display = "none";
  document.getElementById("Help_Faq").style.display = "none";
  document.getElementById("About_project").style.display = "none";
  document.getElementById("Notification_settings").style.display = "none";
  document.getElementById("password_settings").style.display = "none";
  document.getElementById("profile_details").style.display = "none";
  line_rows_show();
}

// === Navigation ===
function home() {
  window.location.href = "/dashboard";
}
function task() {
  window.location.href = "/task";
}
function kyc() {
  window.location.href = "/kyc";
}
function me() {
  window.location.href = "/settings";
}
function signup() {
  window.location.href = "/signup";
}

// === Copy Text ===
function copyInputText() {
  const input = document.getElementById("copyInput");
  input.select();
  input.setSelectionRange(0, 99999);
  navigator.clipboard
    .writeText(input.value)
    .then(() => alert("Copied: " + input.value))
    .catch((err) => alert("Failed to copy: " + err));
}

// === Update Profile Info ===
document
  .getElementById("profileUpdateForm")
  ?.addEventListener("submit", function (e) {
    e.preventDefault();
    const formData = new FormData(this);

    fetch("/update-profile", {
      method: "POST",
      credentials: "include",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        alert(data.message || "Profile updated");
        window.location.reload();
      })
      .catch((err) => console.error("Profile update failed:", err));
  });

// === Load Profile Data ===
function loadUserProfile() {
  fetch("/get-user", { credentials: "include" })
    .then((res) => res.json())
    .then((user) => {
      const profileImg = document.querySelector("#dashboard-profile-img");
      const profileName = document.querySelector("#dashboard-profile-name");
      const uidSpan = document.querySelector("#dashboard-uid");
      const refSpan = document.querySelector("#referral-code");

      if (profileImg && user.profilePicture)
        profileImg.src = user.profilePicture;
      if (profileName && user.fullname) profileName.textContent = user.fullname;
      if (uidSpan) uidSpan.textContent = user.uid;
      if (refSpan) refSpan.textContent = user.referralCode;

      const settingsImg = document.querySelector("#settings-profile-img");
      const settingsName = document.querySelector("#settings-profile-name");
      const formName = document.querySelector("#fullName");
      const nameDisplay = document.querySelector("#profile-name-display");

      if (settingsImg && user.profilePicture)
        settingsImg.src = user.profilePicture;
      if (settingsName && user.fullname)
        settingsName.textContent = user.fullname;
      if (formName && user.fullname) formName.value = user.fullname;
      if (nameDisplay && user.fullname) nameDisplay.textContent = user.fullname;

      // ✅ Update KYC Status in settings
      const kycStatus = document.getElementById("kyc-status");
      if (kycStatus) {
        if (user.kycStatus === "approved") {
          kycStatus.textContent = "Verified";
          kycStatus.classList.remove("text-warning");
          kycStatus.classList.add("text-success");
        } else {
          kycStatus.textContent = "Unverified";
          kycStatus.classList.remove("text-success");
          kycStatus.classList.add("text-warning");
        }
      }
    })
    .catch((err) => console.error("Failed to load user info:", err));
}

function fetchTodayStats() {
  fetch("/get-stats", { credentials: "include" })
    .then((res) => res.json())
    .then((data) => {
      const stats = data.stats;

      document.getElementById("todays-profit").textContent =
        stats.todaysProfit.toFixed(2);
      document.getElementById("total-profit").textContent =
        stats.totalProfit.toFixed(2);
      document.getElementById("task-count").textContent = stats.taskCount;
      document.getElementById("freeze-balance").textContent =
        stats.freezeBalance.toFixed(2);
    })
    .catch((err) => console.error("Failed to fetch task stats:", err));
}

document.addEventListener("DOMContentLoaded", () => {
  fetchBalance();
  fetchReferralData();
  loadUserProfile();
  fetchTodayStats(); // 👈 Add this
});

function loadSettingsProfile() {
  fetch("/get-user", { credentials: "include" })
    .then((res) => res.json())
    .then((user) => {
      document.getElementById("settings-profile-name").textContent =
        user.fullname || "User";
      document.getElementById("settings-profile-img").src =
        user.profilePicture || "./IMAGES/default-user.png";

      // ✅ Set KYC Status text
      const kycStatusSpan = document.getElementById("kyc-status");
      if (user.kycStatus === "approved") {
        kycStatusSpan.textContent = "✅ VERIFIED";
        kycStatusSpan.classList.add("text-success");
      } else {
        kycStatusSpan.textContent = "Unverified";
        kycStatusSpan.classList.remove("text-success");
        kycStatusSpan.classList.add("text-warning");
      }
    })
    .catch((err) => console.error("Error loading profile settings:", err));
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  fetch("/logout")
    .then(() => (window.location.href = "/login"))
    .catch(() => alert("Logout failed"));
});

function withdrawPage() {
  window.location.href = "/withdrawal";
}

// Fetch current user profile info
fetch("/user/profile", {
  method: "GET",
  credentials: "include",
})
  .then((res) => res.json())
  .then((user) => {
    document.getElementById("settings-profile-name").textContent =
      user.fullname || "No name";
    document.getElementById("profile-name-display").textContent =
      user.fullname || "No name";
    document.getElementById(
      "profile-balance-display"
    ).textContent = `₦${user.balance.toFixed(2)}`;
    document.getElementById(
      "profile-withdrawal-display"
    ).textContent = `₦${user.totalWithdrawn.toFixed(2)}`;

    // ✅ Set KYC Status
    const kycStatusEl = document.getElementById("kyc-status");
    if (user.kycStatus === "approved") {
      kycStatusEl.textContent = "Verified";
      kycStatusEl.classList.remove("text-warning");
      kycStatusEl.classList.add("text-success");
    } else {
      kycStatusEl.textContent = "Unverified";
      kycStatusEl.classList.remove("text-success");
      kycStatusEl.classList.add("text-warning");
    }
  })
  .catch((err) => {
    console.error("Failed to fetch user profile:", err);
  });
