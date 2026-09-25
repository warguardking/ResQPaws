const API_BASE_URL = "http://127.0.0.1:8000";

let token = localStorage.getItem("resqpaws_token");
let currentUser = null;
let volunteerAvailability = false;

// ================================
// COMMON API FUNCTION
// ================================

async function apiRequest(endpoint, options = {}) {

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,
            headers
        }
    );

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {

        const message =
            data?.detail ||
            "Something went wrong";

        throw new Error(message);
    }

    return data;
}


// ================================
// UI HELPERS
// ================================

function showMessage(elementId, message, success = true) {

    const element =
        document.getElementById(elementId);

    if (!element) {
        console.log(message);
        return;
    }

    element.textContent = message;

    element.style.color = success
        ? "#16845e"
        : "#b23b3b";
}
function updateProviderProfile() {

    const section =
        document.getElementById("providerProfileSection");

    if (!section) return;

    if (
        !currentUser ||
        !["ngo", "vet"].includes(currentUser.role)
    ) {
        section.classList.add("hidden");
        return;
    }

    section.classList.remove("hidden");

    const organizationName =
        document.getElementById("providerOrganizationName");

    const roleBadge =
        document.getElementById("providerRoleBadge");

    const icon =
        document.getElementById("providerProfileIcon");

    const contactName =
        document.getElementById("providerContactName");

    const phone =
        document.getElementById("providerPhone");
    
    const cleanPhone =
        phone.trim();

    if (
    cleanPhone &&
    !/^[0-9]{10}$/.test(cleanPhone)
) {

    showMessage(
        "registerMessage",
        "Phone number must contain exactly 10 digits.",
        false
    );

    return;
}

    const address =
        document.getElementById("providerAddress");

    const availableTime =
        document.getElementById("providerAvailableTime");

    const services =
        document.getElementById("providerServices");

    const emergency =
        document.getElementById("providerEmergency");


    organizationName.textContent =
        currentUser.organization_name ||
        "Organization / Hospital";


    if (currentUser.role === "ngo") {

        roleBadge.textContent = "NGO";
        icon.textContent = "🏢";

    } else {

        roleBadge.textContent = "Veterinary Hospital";
        icon.textContent = "🏥";

    }


    contactName.textContent =
        currentUser.full_name || "—";


    phone.textContent =
        currentUser.phone || "—";


    address.textContent =
        currentUser.location || "—";


    if (
        currentUser.available_from &&
        currentUser.available_to
    ) {

        availableTime.textContent =
            `${currentUser.available_from} - ${currentUser.available_to}`;

    } else {

        availableTime.textContent = "Not specified";

    }


    services.textContent =
        currentUser.services || "Not specified";


    emergency.textContent =
        currentUser.emergency_available
            ? "Available"
            : "Not available";
}

function updateAuthUI() {

    const guestAuthButtons =
        document.getElementById("guestAuthButtons");

    const loggedInUserArea =
        document.getElementById("loggedInUserArea");

    const userDisplay =
        document.getElementById("userDisplay");

    const userRoleDisplay =
        document.getElementById("userRoleDisplay");

    const menuUserName =
        document.getElementById("menuUserName");

    const menuUserRole =
        document.getElementById("menuUserRole");

    const authSection =
        document.getElementById("authSection");


    // =================================
    // GUEST
    // =================================

    if (!currentUser) {

        if (guestAuthButtons) {
            guestAuthButtons.classList.remove("hidden");
        }

        if (loggedInUserArea) {
            loggedInUserArea.classList.add("hidden");
        }

        if (authSection) {
            authSection.classList.remove("hidden");
        }

    }


    // =================================
    // LOGGED IN
    // =================================

    else {

        volunteerAvailability =
            currentUser.is_available === true;

        if (guestAuthButtons) {
            guestAuthButtons.classList.add("hidden");
        }

        if (loggedInUserArea) {
            loggedInUserArea.classList.remove("hidden");
        }

        if (authSection) {
            authSection.classList.add("hidden");
        }


        // =================================
        // ROLE NAME
        // =================================

        const roleNames = {

            public: "Public User",

            volunteer: "Volunteer",

            ngo: "NGO",

            vet: "Veterinary Hospital / Vet"

        };


        const roleName =
            roleNames[currentUser.role] ||
            currentUser.role;


        // =================================
        // TOP NAV USER
        // =================================

        if (userDisplay) {

            userDisplay.textContent =
                currentUser.full_name;

        }


        if (userRoleDisplay) {

            userRoleDisplay.textContent =
                roleName;

        }


        // =================================
        // MENU USER
        // =================================

        if (menuUserName) {

            menuUserName.textContent =
                currentUser.full_name;

        }


        if (menuUserRole) {

            menuUserRole.textContent =
                roleName;

        }

    }


    // =================================
    // PROVIDER PROFILE
    // =================================

    updateProviderProfile();


    // =================================
    // ROLE BASED MENU + SECTIONS
    // =================================

    const roleItems = [
        "menuAiAssistant",
        "menuReport",
        "menuAnnouncements",
        "menuNearbyHelpers",
        "menuHistory",
        "menuTrackReports",
        "menuRescueRequests",
        "menuActiveRescues",
        "menuResolvedHistory"
    ];

    roleItems.forEach(function (id) {
        const item = document.getElementById(id);
        if (item) item.style.display = "none";
    });

    const aiRescueSection = document.getElementById("aiRescueAssistant");
    const reportSection = document.getElementById("report");
    const nearbyHelpersSection = document.getElementById("nearbyHelpersSection");
    const historySection = document.getElementById("history");
    const nearbyRescuesSection = document.getElementById("nearbyRescues");
    const activeRescuesSection = document.getElementById("activeRescues");
    const resolvedHistorySection = document.getElementById("resolvedHistory");
    const announcementsSection = document.getElementById("announcements");
    const announcementPostCard = document.getElementById("announcementPostCard");

    function arrangeRolePageOrder(role) {
        // The project does not use a <main> element. Keep the actual page sections
        // in exactly the same order as the role's menu.
        const body = document.body;
        if (!body) return;

        const sectionMap = {
            aiRescueAssistant: document.getElementById("aiRescueAssistant"),
            announcements: document.getElementById("announcements"),
            report: document.getElementById("report"),
            nearbyHelpersSection: document.getElementById("nearbyHelpersSection"),
            history: document.getElementById("history"),
            nearbyRescues: document.getElementById("nearbyRescues"),
            activeRescues: document.getElementById("activeRescues"),
            resolvedHistory: document.getElementById("resolvedHistory")
        };

        let order = [];

        if (role === "public") {
            order = [
                "announcements",
                "aiRescueAssistant",
                "report",
                "nearbyHelpersSection",
                "history"
            ];
        } else if (role === "volunteer") {
            order = [
                "announcements",
                "aiRescueAssistant",
                "report",
                "history",
                "nearbyRescues",
                "activeRescues",
                "resolvedHistory"
            ];
        } else if (["ngo", "vet"].includes(role)) {
            order = [
                "announcements",
                "nearbyRescues",
                "activeRescues",
                "resolvedHistory"
            ];
        }

        // Keep Home/intro/roles/auth as the Home page content.
        // Put every role-specific page after Home content and BEFORE How It Works.
        // How It Works must always remain the final page section.
        const howItWorks = document.getElementById("howItWorks");
        let insertBefore = howItWorks || null;

        // Remove the target sections from their old positions by moving them
        // one-by-one. insertBefore keeps the exact requested order.
        order.forEach(function (id) {
            const section = sectionMap[id];
            if (!section) return;

            if (insertBefore) {
                body.insertBefore(section, insertBefore);
            } else {
                body.appendChild(section);
            }
            insertBefore = section.nextElementSibling;
        });
    }

    [
        aiRescueSection,
        reportSection,
        nearbyHelpersSection,
        historySection,
        nearbyRescuesSection,
        activeRescuesSection,
        resolvedHistorySection,
        announcementsSection
    ].forEach(function (section) {
        if (section) section.style.display = "none";
    });

    if (announcementPostCard) {
        announcementPostCard.classList.add("hidden");
    }

    const heroReportButton = document.getElementById("heroReportBtn");
    if (heroReportButton) heroReportButton.style.display = "";

    if (currentUser) {
        const helperRoles = ["volunteer", "ngo", "vet"];
        const canReport = ["public", "volunteer"].includes(currentUser.role);

        const menuAiAssistant = document.getElementById("menuAiAssistant");
        const menuReport = document.getElementById("menuReport");
        const heroReportBtn = document.getElementById("heroReportBtn");
        const menuAnnouncements = document.getElementById("menuAnnouncements");
        const menuNearbyHelpers = document.getElementById("menuNearbyHelpers");
        const menuHistory = document.getElementById("menuHistory");
        const menuTrackReports = document.getElementById("menuTrackReports");
        const menuRescueRequests = document.getElementById("menuRescueRequests");
        const menuActiveRescues = document.getElementById("menuActiveRescues");
        const menuResolvedHistory = document.getElementById("menuResolvedHistory");

        if (menuAiAssistant && canReport) {
            menuAiAssistant.style.display = "block";
        }

        if (aiRescueSection && canReport) {
            aiRescueSection.style.display = "";
        }

        if (menuReport && canReport) {
            menuReport.style.display = "block";
            menuReport.textContent = currentUser.role === "volunteer"
                ? "🚨 Report Rescue"
                : "🚨 Report an Animal";
        }

        // NGO/Vet do not report animals, so remove the Home-page report button too.
        if (heroReportBtn) {
            heroReportBtn.style.display = canReport ? "" : "none";
        }

        if (menuAnnouncements) menuAnnouncements.style.display = "block";

        if (reportSection && canReport) reportSection.style.display = "";
        if (announcementsSection) announcementsSection.style.display = "";

        if (currentUser.role === "public") {
            if (menuNearbyHelpers) menuNearbyHelpers.style.display = "block";
            if (menuHistory) {
                menuHistory.textContent = "📋 My Reports";
                menuHistory.href = "#history";
                menuHistory.style.display = "block";
            }
            if (nearbyHelpersSection) nearbyHelpersSection.style.display = "";
            if (historySection) historySection.style.display = "";
        }

        if (currentUser.role === "volunteer") {
            if (menuTrackReports) menuTrackReports.style.display = "block";
            if (menuRescueRequests) menuRescueRequests.style.display = "block";
            if (menuActiveRescues) menuActiveRescues.style.display = "block";
            if (menuResolvedHistory) menuResolvedHistory.style.display = "block";
            if (historySection) historySection.style.display = "";
            if (nearbyRescuesSection) nearbyRescuesSection.style.display = "";
            if (activeRescuesSection) activeRescuesSection.style.display = "";
            if (resolvedHistorySection) resolvedHistorySection.style.display = "";
        }

        if (["ngo", "vet"].includes(currentUser.role)) {
            if (menuRescueRequests) menuRescueRequests.style.display = "block";
            if (menuActiveRescues) menuActiveRescues.style.display = "block";
            if (menuResolvedHistory) menuResolvedHistory.style.display = "block";
            if (nearbyRescuesSection) nearbyRescuesSection.style.display = "";
            if (activeRescuesSection) activeRescuesSection.style.display = "";
            if (resolvedHistorySection) resolvedHistorySection.style.display = "";
        }

        if (announcementPostCard && ["ngo", "vet"].includes(currentUser.role)) {
            announcementPostCard.classList.remove("hidden");
        }

        const notificationBell = document.getElementById("notificationBell");
        if (notificationBell) notificationBell.style.display = "";

        const historyTitle = document.getElementById("historyTitle");
        if (historyTitle) {
            historyTitle.textContent = currentUser.role === "volunteer"
                ? "🧭 Track My Reports"
                : "📋 My Reports";
        }

        updateNavAvailabilityUI();
        requestBrowserNotificationPermission();
        loadNotifications();
        loadAnnouncements();

        if (["public", "volunteer"].includes(currentUser.role)) {
            loadMyReportedRescues();
        }

        if (helperRoles.includes(currentUser.role)) {
            loadActiveRescues();
            loadResolvedHistory();
        }
    } else {
        const notificationBell = document.getElementById("notificationBell");
        if (notificationBell) notificationBell.style.display = "none";
    }

    arrangeRolePageOrder(currentUser ? currentUser.role : null);

    // =================================
    // AVAILABILITY
    // HELPER ROLES ONLY
    // =================================

    const navAvailability =
        document.getElementById(
            "navAvailability"
        );

    if (navAvailability) {

        const isHelperRole =
            currentUser &&
            ["volunteer", "ngo", "vet"]
                .includes(currentUser.role);


        navAvailability.classList.toggle(
            "hidden",
            !isHelperRole
        );


        if (isHelperRole) {

            updateNavAvailabilityUI();

        }

    }


    // =================================
    // NOTIFICATION BELL
    // HELPER ROLES ONLY
    // =================================

    const notificationBell =
        document.getElementById(
            "notificationBell"
        );



}

// ================================
// LOGIN
// ================================

document
    .getElementById("loginForm")
    .addEventListener("submit", async function (event) {

        event.preventDefault();

        const email =
            document.getElementById("loginEmail").value;

        const password =
            document.getElementById("loginPassword").value;

        try {

            const data = await apiRequest(
                "/api/users/login",
                {
                    method: "POST",
                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );

            token = data.access_token;

            localStorage.setItem(
                "resqpaws_token",
                token
            );

            await loadCurrentUser();

            showMessage(
                "loginMessage",
                "Login successful!",
                true
            );

        } catch (error) {

            showMessage(
                "loginMessage",
                error.message,
                false
            );
        }
    });


// ================================
// REGISTER
// ================================

document
    .getElementById("registerForm")
    .addEventListener("submit", async function (event) {

        event.preventDefault();

        const full_name =
            document.getElementById("registerName").value;

        const email =
            document.getElementById("registerEmail").value;

        const password =
            document.getElementById("registerPassword").value;

        const confirmPassword =
            document.getElementById("registerConfirmPassword").value;

        if (password !== confirmPassword) {

    showMessage(
        "registerMessage",
        "Passwords do not match.",
        false
    );

    return;
}

        const role =
            document.getElementById("registerRole").value;

        const phone =
            document.getElementById("registerPhone").value;

        const location =
            document.getElementById("registerLocation").value;

        const latitude =
            document.getElementById("registerLatitude").value;

        const longitude =
            document.getElementById("registerLongitude").value;

        const registerCoordinates =
            document.getElementById("registerCoordinates");


        // Provider fields
        const organization_name =
            document.getElementById("organizationName").value;

        const available_from =
            document.getElementById("availableFrom").value;

        const available_to =
            document.getElementById("availableTo").value;

        const services =
            document.getElementById("services").value;

        const emergency_available =
            document.getElementById("emergencyAvailable").checked;


        try {

            await apiRequest(
                "/api/users/register",
                {
                    method: "POST",

                    body: JSON.stringify({
                        full_name,
                        email,
                        password,
                        role,

                        phone: phone || null,
                        location: location || null,
                        latitude:
                            latitude ? parseFloat(latitude) : null,

                        longitude:
                            longitude ? parseFloat(longitude) : null,

                        organization_name:
                            organization_name || null,

                        available_from:
                            available_from || null,

                        available_to:
                            available_to || null,

                        services:
                            services || null,

                        emergency_available
                    })
                }
            );


            showMessage(
                "registerMessage",
                "Account created! Now login.",
                true
            );


            document
                .getElementById("registerForm")
                .reset();


            // Hide provider fields again
            updateProviderFields();


        } catch (error) {

            showMessage(
                "registerMessage",
                error.message,
                false
            );
        }
    });
const toggleRegisterPassword =
    document.getElementById("toggleRegisterPassword");

const registerPassword =
    document.getElementById("registerPassword");

if (toggleRegisterPassword && registerPassword) {

    toggleRegisterPassword.addEventListener(
        "click",
        function () {

            if (registerPassword.type === "password") {

                registerPassword.type = "text";

                toggleRegisterPassword.textContent =
                    "🙈";

            } else {

                registerPassword.type = "password";

                toggleRegisterPassword.textContent =
                    "👁️";
            }
        }
    );
}
const toggleRegisterConfirmPassword =
    document.getElementById("toggleRegisterConfirmPassword");

const registerConfirmPassword =
    document.getElementById("registerConfirmPassword");

if (
    toggleRegisterConfirmPassword &&
    registerConfirmPassword
) {

    toggleRegisterConfirmPassword.addEventListener(
        "click",
        function () {

            if (
                registerConfirmPassword.type ===
                "password"
            ) {

                registerConfirmPassword.type =
                    "text";

                toggleRegisterConfirmPassword.textContent =
                    "🙈";

            } else {

                registerConfirmPassword.type =
                    "password";

                toggleRegisterConfirmPassword.textContent =
                    "👁️";
            }
        }
    );
}
// ================================
// LOAD CURRENT USER
// ================================

async function loadCurrentUser() {

    if (!token) {
        return;
    }

    try {

        const data = await apiRequest(
            "/api/users/me"
        );

        currentUser = data;
        updateAuthUI();

    } catch (error) {

        console.log(
            "Current user endpoint unavailable:",
            error.message
        );

        token = null;
        currentUser = null;

        localStorage.removeItem(
            "resqpaws_token"
        );

        updateAuthUI();
    }
}

async function loadNotifications() {

    const notificationList =
        document.getElementById("notificationList");

    if (!notificationList) {
        return;
    }

    if (!token) {
        notificationList.innerHTML = `
            <div class="empty-state">
                Login to view notifications.
            </div>
        `;
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/api/notifications`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error("Failed to load notifications");
        }

        const notifications = await response.json();

        const badge = document.getElementById("notificationBadge");
        const unreadCount = (notifications || []).filter(function (item) {
            return !item.is_read;
        }).length;

        if (badge) {
            badge.textContent = unreadCount;
            badge.classList.toggle("hidden", unreadCount === 0);
        }

        const currentIds = new Set((notifications || []).map(function (item) {
            return item.id;
        }));

        if (notificationIdsSeen !== null) {
            (notifications || []).forEach(function (item) {
                if (!notificationIdsSeen.has(item.id) && !item.is_read) {
                    notifyBrowser(item.title, item.message);
                }
            });
        }

        notificationIdsSeen = currentIds;

        if (!notifications || notifications.length === 0) {

            notificationList.innerHTML = `
                <div class="empty-state">
                    No notifications yet.
                </div>
            `;

            return;
        }

        notificationList.innerHTML = notifications.map(notification => {

            const unreadClass =
                notification.is_read ? "" : "unread";

            const createdAt =
                notification.created_at
                    ? new Date(notification.created_at).toLocaleString()
                    : "";

            return `
                <div
                    class="notification-item ${unreadClass}"
                    data-notification-id="${notification.id}"
                >

                    <div class="notification-content">

                        <div class="notification-title">
                            ${notification.title}
                        </div>

                        <div class="notification-message">
                            ${notification.message}
                        </div>

                        <div class="notification-time">
                            ${createdAt}
                        </div>

                    </div>

                    <div class="notification-actions">

                        ${
                            !notification.is_read
                            ? `
                                <button
                                    type="button"
                                    class="notification-read-btn"
                                    onclick="markNotificationRead(${notification.id})"
                                >
                                    Mark read
                                </button>
                            `
                            : ""
                        }

                        <button
                            type="button"
                            class="notification-delete-btn"
                            onclick="deleteNotification(${notification.id})"
                        >
                            Delete
                        </button>

                    </div>

                </div>
            `;

        }).join("");

    } catch (error) {

        console.error(
            "Notification loading error:",
            error
        );

        notificationList.innerHTML = `
            <div class="empty-state">
                Unable to load notifications.
            </div>
        `;
    }
}
const notificationBell =
    document.getElementById("notificationBell");

const notificationDropdown =
    document.getElementById("notificationDropdown");

if (notificationBell && notificationDropdown) {

    notificationBell.addEventListener(
        "click",
        async function () {

            notificationDropdown.classList.toggle("hidden");

            if (
                !notificationDropdown.classList.contains("hidden")
            ) {
                await loadNotifications();
            }
        }
    );
}
async function markNotificationRead(notificationId) {

    try {

        const response = await fetch(
            `${API_BASE_URL}/api/notifications/${notificationId}/read`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                "Unable to mark notification as read"
            );
        }

        await loadNotifications();

    } catch (error) {

        console.error(
            "Mark notification read error:",
            error
        );
    }
}
async function markAllNotificationsRead() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/notifications/read-all`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                "Unable to mark all notifications as read"
            );
        }

        await loadNotifications();

    } catch (error) {
        console.error(
            "Mark all notifications read error:",
            error
        );
    }
}
const markAllNotificationsBtn =
    document.getElementById("markAllNotificationsBtn");

if (markAllNotificationsBtn) {
    markAllNotificationsBtn.addEventListener(
        "click",
        async function () {
            await markAllNotificationsRead();
        }
    );
}
async function deleteNotification(notificationId) {

    try {

        const response = await fetch(
            `${API_BASE_URL}/api/notifications/${notificationId}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                "Unable to delete notification"
            );
        }

        await loadNotifications();

    } catch (error) {

        console.error(
            "Delete notification error:",
            error
        );
    }
}
setInterval(function () {
    if (token && currentUser) {
        loadNotifications();
    }
}, 30000);

async function toggleVolunteerAvailability() {

    const newAvailability =
        !volunteerAvailability;

    const location =
        newAvailability
            ? await getCurrentVolunteerLocation()
            : null;


    const requestBody = {
        is_available:
            newAvailability
    };


    if (location) {

        requestBody.latitude =
            location.latitude;

        requestBody.longitude =
            location.longitude;
    }


    const result =
        await apiRequest(
            "/api/users/me/availability",
            {
                method: "PATCH",

                body: JSON.stringify(
                    requestBody
                )
            }
        );


    volunteerAvailability =
        result.is_available === true;

    currentUser.is_available =
        volunteerAvailability;


    if (
        location &&
        volunteerAvailability
    ) {

        currentUser.latitude =
            location.latitude;

        currentUser.longitude =
            location.longitude;
    }


    updateNavAvailabilityUI();


    if (volunteerAvailability) {

        showMessage(
            "globalMessage",
            "🟢 You are now available. Checking nearby rescues...",
            true
        );

        await loadNearbyRescues();

    } else {

        showMessage(
            "globalMessage",
            "⚪ You are now offline.",
            true
        );
    }
}


// ================================
// LOGOUT
// ================================

document
    .getElementById("menuLogoutBtn")
    .addEventListener("click", function () {

        token = null;
        currentUser = null;

        localStorage.removeItem(
            "resqpaws_token"
        );

        updateAuthUI();

        const notificationList =
            document.getElementById(
                "notificationList"
            );

        if (notificationList) {

            notificationList.innerHTML = `
                <div class="empty-state">
                    Login to view notifications.
                </div>
            `;

        }

        const activeRescueList =
            document.getElementById(
                "activeRescueList"
            );

        if (activeRescueList) {

            activeRescueList.innerHTML = `
                <div class="empty-state">
                    Volunteer active rescues will appear here.
                </div>
            `;

        }

        const navMenu =
            document.getElementById(
                "navMenu"
            );

        if (navMenu) {

            navMenu.classList.add(
                "hidden"
            );

        }

    });
    function updateNavAvailabilityUI() {

    const navStatus =
        document.getElementById("navAvailabilityStatus");

    const navButton =
        document.getElementById("navAvailabilityBtn");

    if (!navStatus || !navButton) {
        return;
    }

    if (volunteerAvailability === true) {

        navStatus.textContent =
            "🟢 Available";

        navButton.textContent =
            "Turn OFF";

    } else {

        navStatus.textContent =
            "⚪ Offline";

        navButton.textContent =
            "Turn ON";
    }
}

const navAvailabilityBtn =
    document.getElementById("navAvailabilityBtn");

if (navAvailabilityBtn) {

    navAvailabilityBtn.addEventListener(
        "click",
        async function () {

            if (navAvailabilityBtn.disabled) {
                return;
            }

            navAvailabilityBtn.disabled = true;

            try {

                await toggleVolunteerAvailability();

            } catch (error) {

                console.error(
                    "Navbar availability error:",
                    error
                );

                showMessage(
                    "globalMessage",
                    error.message ||
                    "Unable to update availability.",
                    false
                );

            } finally {

                navAvailabilityBtn.disabled = false;

            }

        }
    );
}

// ================================
// AUTH PAGE NAVIGATION
// ================================

function showLoginPage() {

    const loginCard =
        document.getElementById("loginCard");

    const registerCard =
        document.getElementById("registerCard");

    const authSection =
        document.getElementById("authSection");

    if (!loginCard || !registerCard) {
        return;
    }

    loginCard.classList.remove("hidden");
    registerCard.classList.add("hidden");

    if (authSection) {
        authSection.scrollIntoView({
            behavior: "smooth"
        });
    }
}


function showRegisterPage() {

    const loginCard =
        document.getElementById("loginCard");

    const registerCard =
        document.getElementById("registerCard");

    const authSection =
        document.getElementById("authSection");

    if (!loginCard || !registerCard) {
        return;
    }

    loginCard.classList.add("hidden");
    registerCard.classList.remove("hidden");

    if (authSection) {
        authSection.scrollIntoView({
            behavior: "smooth"
        });
    }
}

// ==========================================
// PROVIDER REGISTRATION FIELDS
// ==========================================

const registerRole =
    document.getElementById("registerRole");

const providerFields =
    document.querySelectorAll(".provider-field");


function updateProviderFields() {

    if (!registerRole) {
        return;
    }

    const selectedRole =
        registerRole.value;

    const isProvider =
        selectedRole === "ngo" ||
        selectedRole === "vet";

    providerFields.forEach(function (field) {

        field.classList.toggle(
            "hidden",
            !isProvider
        );

    });

    // Emergency Assistance
    const emergencyAvailableLabel =
        document.getElementById(
            "emergencyAvailableLabel"
        );

    if (emergencyAvailableLabel) {

        if (isProvider) {

            emergencyAvailableLabel.style.display =
                "";

        } else {

            emergencyAvailableLabel.style.display =
                "none";

        }
    }
}

// Role change
if (registerRole) {

    registerRole.addEventListener(
        "change",
        updateProviderFields
    );

    // Initial state
    updateProviderFields();
}

const navLoginBtn =
    document.getElementById("navLoginBtn");

if (navLoginBtn) {

    navLoginBtn.addEventListener(
        "click",
        showLoginPage
    );
}


const navRegisterBtn =
    document.getElementById("navRegisterBtn");

if (navRegisterBtn) {

    navRegisterBtn.addEventListener(
        "click",
        showRegisterPage
    );
}


const showRegisterBtn =
    document.getElementById("showRegisterBtn");

if (showRegisterBtn) {

    showRegisterBtn.addEventListener(
        "click",
        showRegisterPage
    );
}


const showLoginBtn =
    document.getElementById("showLoginBtn");

if (showLoginBtn) {

    showLoginBtn.addEventListener(
        "click",
        showLoginPage
    );
}
// ==========================================
// REGISTER LOCATION
// ==========================================

const getRegisterLocationBtn =
    document.getElementById("getRegisterLocationBtn");

const registerLocationStatus =
    document.getElementById("registerLocationStatus");

const registerLatitude =
    document.getElementById("registerLatitude");

const registerLongitude =
    document.getElementById("registerLongitude");


if (getRegisterLocationBtn) {

    getRegisterLocationBtn.addEventListener(
        "click",
        function () {

            if (!navigator.geolocation) {

                registerLocationStatus.textContent =
                    "Location is not supported by this browser.";

                registerLocationStatus.className =
                    "location-error";

                return;
            }


            registerLocationStatus.textContent =
                "Getting your location...";

            registerLocationStatus.className = "";


            getRegisterLocationBtn.disabled = true;


            navigator.geolocation.getCurrentPosition(

                async function (position) {

    const latitude =
        position.coords.latitude;

    const longitude =
        position.coords.longitude;


    registerLatitude.value =
        latitude;

    registerLongitude.value =
        longitude;


    registerLocationStatus.textContent =
        "📍 Finding your address...";

    registerLocationStatus.className =
        "location-success";


    try {

        const response =
            await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
            );

        if (!response.ok) {
            throw new Error("Address lookup failed");
        }


        const data =
            await response.json();


        const readableAddress =
            data.display_name ||
            `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;


        document.getElementById("registerLocation").value =
            readableAddress;


        registerLocationStatus.textContent =
            "📍 Current location and address captured";

    }

    catch (error) {

        console.error(
            "Registration address lookup error:",
            error
        );


        document.getElementById("registerLocation").value =
            `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;


        registerLocationStatus.textContent =
            "📍 Location captured. Address lookup failed.";

    }


    getRegisterLocationBtn.textContent =
        "📍 Location Captured";


    getRegisterLocationBtn.disabled =
        false;
},


                function (error) {

                    console.error(
                        "Registration location error:",
                        error
                    );


                    registerLocationStatus.textContent =
                        "Unable to get location. Please allow location access.";

                    registerLocationStatus.className =
                        "location-error";


                    getRegisterLocationBtn.disabled =
                        false;
                }
            );
        }
    );
}
// ================================
// REPORT RESCUE
// ================================

document
    .getElementById("rescueForm")
    .addEventListener("submit", async function (event) {

        event.preventDefault();

        if (!token) {
            showMessage(
                "rescueMessage",
                "Please login before reporting a rescue.",
                false
            );
            return;
        }

        const animalType = document.getElementById("animalType").value;
        const description = document.getElementById("rescueDescription").value;
        const location = document.getElementById("rescueLocation").value;
        const latitude = parseFloat(document.getElementById("rescueLatitude").value);
        const longitude = parseFloat(document.getElementById("rescueLongitude").value);
        const emergencyLevel = document.getElementById("emergencyLevel").value;
        const photoInput = document.getElementById("rescuePhotos");

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            showMessage(
                "rescueMessage",
                "Please use your current location before submitting the rescue.",
                false
            );
            return;
        }

        const formData = new FormData();
        formData.append("animal_type", animalType);
        formData.append("description", description);
        formData.append("location", location);
        formData.append("latitude", latitude);
        formData.append("longitude", longitude);
        formData.append("emergency_level", emergencyLevel);

        if (photoInput && photoInput.files) {
            Array.from(photoInput.files).forEach(function (file) {
                formData.append("photos", file);
            });
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/rescue-requests`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: formData
                }
            );

            let data = null;
            try { data = await response.json(); } catch (_) {}

            if (!response.ok) {
                throw new Error(data?.detail || "Unable to submit rescue request");
            }

            showMessage(
                "rescueMessage",
                "Rescue reported successfully! Nearby helpers have been alerted.",
                true
            );

            document.getElementById("rescueForm").reset();

            const preview = document.getElementById("rescuePhotoPreview");
            if (preview) preview.innerHTML = "";

            // Immediately refresh My Reports / Track My Reports without a page refresh.
            if (["public", "volunteer"].includes(currentUser?.role)) {
                await loadMyReportedRescues();
            }

            await loadNotifications();

        } catch (error) {
            showMessage(
                "rescueMessage",
                error.message,
                false
            );
        }
    });

// Photo preview. No validation is applied here intentionally.
const rescuePhotosInput = document.getElementById("rescuePhotos");
const rescuePhotoPreview = document.getElementById("rescuePhotoPreview");

if (rescuePhotosInput && rescuePhotoPreview) {
    rescuePhotosInput.addEventListener("change", function () {
        rescuePhotoPreview.innerHTML = "";

        Array.from(rescuePhotosInput.files || []).forEach(function (file) {
            const item = document.createElement("div");
            item.className = "photo-preview-item";

            if (file.type && file.type.startsWith("image/")) {
                const image = document.createElement("img");
                image.src = URL.createObjectURL(file);
                image.alt = file.name;
                item.appendChild(image);
            }

            const name = document.createElement("span");
            name.textContent = file.name;
            item.appendChild(name);
            rescuePhotoPreview.appendChild(item);
        });
    });
}

// ================================
// I CAN HELP
// ================================

async function respondToRescue(rescueId) {

    if (!token) {
        alert("Please login first.");
        return;
    }

    try {

        await apiRequest(
            `/api/rescue-requests/${rescueId}/respond`,
            {
                method: "POST"
            }
        );

        alert(
            `🙋 Rescue accepted! You are now assigned to this rescue.

The case has moved to My Active Rescue Requests.`
        );

        await loadNearbyRescues();
        await loadActiveRescues();
        await loadNotifications();

    } catch (error) {

        alert(error.message);
    }
}


// ================================
// VIEW RESCUE
// ================================

async function viewRescue(rescueId) {

    try {

        const rescue =
            await apiRequest(
                `/api/rescue-requests/${rescueId}`
            );


        document
            .getElementById("history")
            .scrollIntoView({
                behavior: "smooth"
            });

        await loadHistory(rescueId);

    } catch (error) {

        alert(error.message);
    }
}

// ================================
// OPEN RESCUE LOCATION
// ================================

function openRescueLocation(latitude, longitude) {

    const url =
        `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

    window.open(url, "_blank");
}


// ================================
// GET DIRECTIONS TO RESCUE
// ================================

function getDirectionsToRescue(latitude, longitude) {

    const url =
        `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

    window.open(url, "_blank");
}

// ================================
// ACTIVE RESCUES
// ================================

async function loadActiveRescues() {
    const container = document.getElementById("activeRescueList");

    if (!container) {
        return;
    }

    try {
        const data = await apiRequest(
            "/api/volunteers/me/active-rescues"
        );

        console.log("ACTIVE RESCUES DATA:", data);

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>🐾 No active rescues right now.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.map(rescue => {

            let statusAction = "";

            if (rescue.status === "accepted") {
                statusAction = `
                    <button
                        class="primary-btn"
                        onclick="updateRescueStatus(
                            ${rescue.id},
                            'rescue_started'
                        )">
                        🚑 Start Rescue
                    </button>
                `;
            }

            else if (rescue.status === "rescue_started") {
                statusAction = `
                    <button
                        class="primary-btn"
                        onclick="updateRescueStatus(
                            ${rescue.id},
                            'vet_assistance'
                        )">
                        🩺 Vet Assistance
                    </button>
                `;
            }

            else if (rescue.status === "vet_assistance") {
                statusAction = `
                    <button
                        class="primary-btn"
                        onclick="updateRescueStatus(
                            ${rescue.id},
                            'treatment'
                        )">
                        💊 Start Treatment
                    </button>
                `;
            }

            else if (rescue.status === "treatment") {
                statusAction = `
                    <button
                        class="primary-btn"
                        onclick="updateRescueStatus(
                            ${rescue.id},
                            'resolved'
                        )">
                        ✅ Resolve Rescue
                    </button>
                `;
            }

            return `
                <div class="rescue-card">

                    <!-- HEADER -->
                    <div class="rescue-card-header">

                        <div>
                            <p class="rescue-card-label">
                                RESCUE REQUEST
                            </p>

                            <h3>
                                🐾 ${escapeHtml(rescue.animal_type)}
                            </h3>
                        </div>

                        <span class="status-badge">
                            ${escapeHtml(
                                formatStatus(rescue.status)
                            )}
                        </span>

                    </div>


                    <!-- DESCRIPTION -->
                    <div class="rescue-info-section">

                        <span class="info-label">
                            📝 Description
                        </span>

                        <p class="rescue-description">
                            ${escapeHtml(rescue.description)}
                        </p>

                    </div>

                    ${renderPhotoGallery(rescue.photo_urls)}


                    <!-- LOCATION -->
                    <div class="rescue-location-card">

                        <span class="info-label">
                            📍 Location
                        </span>

                        <p class="location-name">
                            ${escapeHtml(rescue.location)}
                        </p>

                        <div class="map-actions">

                            <button
                                class="secondary-btn"
                                onclick="openRescueLocation(
                                    ${rescue.latitude},
                                    ${rescue.longitude}
                                )">
                                🗺️ View Location
                            </button>

                            <button
                                class="secondary-btn"
                                onclick="getDirectionsToRescue(
                                    ${rescue.latitude},
                                    ${rescue.longitude}
                                )">
                                🧭 Get Directions
                            </button>

                        </div>

                    </div>


                    <!-- EMERGENCY -->
                    <div class="rescue-meta">

                        <span class="emergency-level">
                            🚨
                            ${escapeHtml(
                                rescue.emergency_level
                            ).toUpperCase()}
                            EMERGENCY
                        </span>

                    </div>


                    <!-- ACTIONS -->
                    <div class="rescue-actions">

                        ${statusAction}

                        <button
                            class="secondary-btn"
                            onclick="toggleInlineRescueHistory(
                                ${rescue.id},
                                'active-history-${rescue.id}'
                            )">
                            📋 View History
                        </button>

                    </div>

                    <div
                        id="active-history-${rescue.id}"
                        class="inline-rescue-history hidden">
                    </div>

                </div>
            `;
        }).join("");

    } catch (error) {

        console.error(
            "Active rescue loading error:",
            error
        );

        container.innerHTML = `
            <div class="empty-state">
                <p>Unable to load active rescues.</p>
            </div>
        `;
    }
}


// ================================
// UPDATE RESCUE STATUS
// ================================

async function updateRescueStatus(
    rescueId,
    status
) {

    try {

        await apiRequest(
            `/api/rescue/${rescueId}/status`,
            {
                method: "PUT",
                body: JSON.stringify({
                    status
                })
            }
        );

        if (status === "resolved") {
            alert(
                `🎉 Case completed! Thank you for helping this animal.

Your completed rescue has been permanently added to Resolved History.`
            );
            await loadNotifications();
            await loadActiveRescues();
            await loadResolvedHistory();
        } else {
            await loadActiveRescues();
        }

    } catch (error) {

        alert(error.message);
    }
}
async function loadMyReportedRescues() {

    const container =
        document.getElementById("historyList");

    if (!container) return;

    try {

        const data =
            await apiRequest(
                "/api/rescue-requests/my-reports"
            );

        if (!data || !data.length) {

            container.innerHTML = `
                <div class="empty-state">
                    You have not reported any rescues yet.
                </div>
            `;

            return;
        }


        container.innerHTML = `
            <div class="reported-rescues-grid">

                ${data.map(rescue => {

                    const isResolved =
                        rescue.status === "resolved";

                    const statusClass =
                        rescue.status === "resolved"
                            ? "status-resolved"
                            : "status-active";


                    return `

                        <div
                            class="reported-rescue-card"
                            id="rescue-card-${rescue.id}"
                        >

                            <div class="reported-rescue-top">

                                <div class="reported-animal-icon">
                                    🐾
                                </div>

                                <div class="reported-rescue-title">

                                    <h3>
                                        ${escapeHtml(
                                            rescue.animal_type
                                        )}
                                    </h3>

                                    <span
                                        class="rescue-status-badge ${statusClass}"
                                    >
                                        ${escapeHtml(
                                            formatStatus(
                                                rescue.status
                                            )
                                        )}
                                    </span>

                                </div>

                            </div>


                            <div class="reported-rescue-details">

                                <div class="rescue-detail-row">
                                    <span>📍 Location</span>
                                    <strong>
                                        ${escapeHtml(
                                            rescue.location
                                        )}
                                    </strong>
                                </div>

                                <div class="rescue-detail-row">
                                    <span>🚨 Emergency</span>
                                    <strong>
                                        ${escapeHtml(
                                            rescue.emergency_level
                                        )}
                                    </strong>
                                </div>

                            </div>

                            ${renderPhotoGallery(rescue.photo_urls)}


                            <div class="reported-rescue-actions">

                                <button
                                    type="button"
                                    class="secondary-btn"
                                    onclick="loadHistory(${rescue.id})"
                                >
                                    📋 View History
                                </button>

                            </div>


                            <div
                                id="history-${rescue.id}"
                                class="individual-history hidden"
                            ></div>

                        </div>

                    `;

                }).join("")}

            </div>
        `;

    } catch (error) {

        console.error(
            "My reported rescues error:",
            error
        );

        container.innerHTML = `
            <div class="empty-state">
                ${escapeHtml(error.message)}
            </div>
        `;
    }
}

// ================================
// INLINE RESCUE HISTORY
// ================================

async function toggleInlineRescueHistory(
    rescueId,
    targetId
) {

    const historyContainer =
        document.getElementById(targetId);

    if (!historyContainer) {
        return;
    }

    if (
        !historyContainer.classList.contains("hidden")
    ) {

        historyContainer.classList.add(
            "hidden"
        );

        historyContainer.innerHTML = "";

        return;
    }

    historyContainer.innerHTML = `
        <div class="empty-state">
            Loading rescue timeline...
        </div>
    `;

    historyContainer.classList.remove(
        "hidden"
    );

    try {

        const data =
            await apiRequest(
                `/api/rescue-requests/${rescueId}/history`
            );

        if (
            !data.history ||
            data.history.length === 0
        ) {

            historyContainer.innerHTML = `
                <div class="empty-state">
                    No rescue history available.
                </div>
            `;

            return;
        }

        historyContainer.innerHTML = `
            <div class="rescue-timeline-card">

                <div class="timeline-header">
                    <div>
                        <span class="timeline-kicker">
                            RESCUE HISTORY
                        </span>
                        <h4>Case Timeline</h4>
                    </div>

                    <button
                        type="button"
                        class="timeline-close-btn"
                        onclick="toggleInlineRescueHistory(
                            ${rescueId},
                            '${targetId}'
                        )">
                        Close
                    </button>
                </div>

                <div class="status-timeline">

                    ${data.history.map(item => `

                        <div class="timeline-item">

                            <div class="timeline-dot"></div>

                            <div class="timeline-content">

                                <div class="timeline-status">
                                    ${escapeHtml(
                                        formatStatus(item.status)
                                    )}
                                </div>

                                <div class="timeline-date">
                                    ${escapeHtml(
                                        item.created_at || ""
                                    )}
                                </div>

                                <small>
                                    Updated by
                                    ${escapeHtml(
                                        item.updated_by_name ||
                                        "Unknown user"
                                    )}
                                </small>

                            </div>

                        </div>

                    `).join("")}

                </div>

            </div>
        `;

    } catch (error) {

        console.error(
            "Inline rescue history error:",
            error
        );

        historyContainer.innerHTML = `
            <div class="empty-state">
                ${escapeHtml(error.message)}
            </div>
        `;
    }
}


// ================================
// HISTORY
// ================================

async function loadHistory(rescueId) {

    const container =
        document.getElementById("historyList");

    if (!container) return;

    try {

        const data =
            await apiRequest(
                `/api/rescue-requests/${rescueId}/history`
            );

        if (!data.history || !data.history.length) {

            const existingHistory =
                document.getElementById(
                    `history-${rescueId}`
                );

            if (existingHistory) {
                existingHistory.innerHTML = `
                    <div class="empty-state">
                        No history available.
                    </div>
                `;
            }

            return;
        }

        const historyContainer =
            document.getElementById(
                `history-${rescueId}`
            );

        if (!historyContainer) return;

        historyContainer.innerHTML = `
            <div class="rescue-timeline-card">

                <h4>
                    Rescue Timeline
                </h4>

                <div class="status-timeline">

                    ${data.history.map(item => `

                        <div class="timeline-item">

                            <div class="timeline-status">
                                ${escapeHtml(
                                    formatStatus(item.status)
                                )}
                            </div>

                            <div class="timeline-date">
                                ${escapeHtml(
                                    item.created_at || ""
                                )}
                            </div>

                            <small>
                                Updated by
                                ${escapeHtml(
                                    item.updated_by_name ||
                                    "Unknown user"
                                )}
                            </small>

                        </div>

                    `).join("")}

                </div>

            </div>
        `;

        historyContainer.classList.remove(
            "hidden"
        );

    } catch (error) {

        console.error(
            "Rescue history error:",
            error
        );

        const historyContainer =
            document.getElementById(
                `history-${rescueId}`
            );

        if (historyContainer) {

            historyContainer.innerHTML = `
                <div class="empty-state">
                    ${escapeHtml(error.message)}
                </div>
            `;

            historyContainer.classList.remove(
                "hidden"
            );
        }
    }
}

// ================================
// STATUS FORMATTER
// ================================

function renderPhotoGallery(photoUrls) {
    if (!photoUrls || !photoUrls.length) return "";

    return `
        <div class="rescue-photo-section">
            <span class="info-label">📷 Animal Photos</span>
            <div class="rescue-photo-grid">
                ${photoUrls.map(function (url) {
                    return `
                        <a href="${escapeHtml(API_BASE_URL + url)}" target="_blank" rel="noopener noreferrer">
                            <img src="${escapeHtml(API_BASE_URL + url)}" alt="Rescue animal photo" loading="lazy">
                        </a>
                    `;
                }).join("")}
            </div>
        </div>
    `;
}


// ================================
// RESOLVED HISTORY
// ================================

async function loadResolvedHistory() {
    const container = document.getElementById("resolvedHistoryList");
    if (!container || !currentUser || !["volunteer", "ngo", "vet"].includes(currentUser.role)) {
        return;
    }

    try {
        const data = await apiRequest("/api/volunteers/me/resolved-history");

        if (!data || !data.length) {
            container.innerHTML = `
                <div class="empty-state">
                    🐾 No completed rescue cases yet.
                </div>
            `;
            return;
        }

        container.innerHTML = data.map(function (rescue) {
            return `
                <div class="rescue-card resolved-history-card">
                    <div class="rescue-card-header">
                        <div>
                            <p class="rescue-card-label">COMPLETED RESCUE</p>
                            <h3>🐾 ${escapeHtml(rescue.animal_type)}</h3>
                        </div>
                        <span class="status-badge">✅ Resolved</span>
                    </div>

                    <div class="rescue-info-section">
                        <span class="info-label">📍 Location</span>
                        <p class="location-name">${escapeHtml(rescue.location)}</p>
                    </div>

                    <div class="rescue-info-section">
                        <span class="info-label">📝 Description</span>
                        <p class="rescue-description">${escapeHtml(rescue.description)}</p>
                    </div>

                    ${renderPhotoGallery(rescue.photo_urls)}

                    <div class="rescue-actions">
                        <button
                            class="secondary-btn"
                            onclick="toggleInlineRescueHistory(${rescue.id}, 'resolved-history-${rescue.id}')"
                        >
                            📋 View History
                        </button>
                    </div>

                    <div id="resolved-history-${rescue.id}" class="inline-rescue-history hidden"></div>
                </div>
            `;
        }).join("");
    } catch (error) {
        console.error("Resolved history error:", error);
        container.innerHTML = `
            <div class="empty-state">Unable to load resolved history.</div>
        `;
    }
}


// ================================
// ANNOUNCEMENTS
// ================================

async function loadAnnouncements() {
    const container = document.getElementById("announcementList");
    if (!container || !token) return;

    try {
        const announcements = await apiRequest("/api/announcements");

        if (!announcements || !announcements.length) {
            container.innerHTML = `
                <div class="empty-state">No announcements yet.</div>
            `;
            return;
        }

        container.innerHTML = announcements.map(function (announcement) {
            const poster = announcement.poster_url
                ? `<img class="announcement-poster" src="${escapeHtml(API_BASE_URL + announcement.poster_url)}" alt="Announcement poster" loading="lazy">`
                : "";

            const createdAt = announcement.created_at
                ? new Date(announcement.created_at).toLocaleString()
                : "";

            const eventDate = announcement.event_date
                ? new Date(`${announcement.event_date}T00:00:00`).toLocaleDateString()
                : "";

            return `
                <article class="announcement-card">
                    ${poster}
                    <div class="announcement-card-body">
                        <p class="eyebrow">COMMUNITY UPDATE</p>
                        <h3>${escapeHtml(announcement.title)}</h3>
                        ${eventDate ? `<p class="announcement-event-date">📅 Event date: ${escapeHtml(eventDate)}</p>` : ""}
                        ${announcement.location ? `<p class="announcement-location">📍 ${escapeHtml(announcement.location)}</p>` : ""}
                        <p>${escapeHtml(announcement.description)}</p>
                        <span class="announcement-time">Posted: ${createdAt}</span>
                    </div>
                </article>
            `;
        }).join("");
    } catch (error) {
        console.error("Announcements error:", error);
        container.innerHTML = `
            <div class="empty-state">Unable to load announcements.</div>
        `;
    }
}


const announcementForm = document.getElementById("announcementForm");
const announcementEventDate = document.getElementById("announcementEventDate");

if (announcementEventDate) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    announcementEventDate.min = `${yyyy}-${mm}-${dd}`;
}

if (announcementForm) {
    announcementForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const formData = new FormData();
        formData.append("title", document.getElementById("announcementTitle").value);
        formData.append("event_date", document.getElementById("announcementEventDate").value);
        formData.append("location", document.getElementById("announcementLocation").value);
        formData.append("description", document.getElementById("announcementDescription").value);

        const poster = document.getElementById("announcementPoster");
        if (poster && poster.files && poster.files[0]) {
            formData.append("poster", poster.files[0]);
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/announcements`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: formData
                }
            );

            let data = null;
            try { data = await response.json(); } catch (_) {}

            if (!response.ok) {
                throw new Error(data?.detail || "Unable to post announcement");
            }

            showMessage("announcementMessage", "Announcement posted and users have been notified!", true);
            announcementForm.reset();
            await loadAnnouncements();
            await loadNotifications();
        } catch (error) {
            showMessage("announcementMessage", error.message, false);
        }
    });
}


// Remove expired announcements from the visible page automatically when the date changes.
setInterval(function () {
    if (token) {
        loadAnnouncements();
    }
}, 60000);


// ================================
// AI RESCUE ASSISTANT (PUBLIC + VOLUNTEER)
// ================================

const aiRescueForm = document.getElementById("aiRescueForm");
const aiRescueImage = document.getElementById("aiRescueImage");
const aiImagePreview = document.getElementById("aiImagePreview");

if (aiRescueImage && aiImagePreview) {
    aiRescueImage.addEventListener("change", function () {
        aiImagePreview.innerHTML = "";

        const file = aiRescueImage.files && aiRescueImage.files[0];
        if (!file) return;

        const imageUrl = URL.createObjectURL(file);
        aiImagePreview.innerHTML = `
            <img src="${imageUrl}" alt="Selected animal photo">
            <span>${escapeHtml(file.name)}</span>
        `;
    });
}

function renderAiList(elementId, items) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const safeItems = Array.isArray(items) ? items : [];

    element.innerHTML = safeItems.length
        ? safeItems.map(function (item) {
            return `<li>${escapeHtml(item)}</li>`;
        }).join("")
        : "<li>No specific steps were returned.</li>";
}

if (aiRescueForm) {
    aiRescueForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!token || !currentUser || !["public", "volunteer"].includes(currentUser.role)) {
            showMessage("aiRescueMessage", "The Rescue Assistant is available only for public users and volunteers.", false);
            return;
        }

        const file = aiRescueImage?.files?.[0];
        if (!file) {
            showMessage("aiRescueMessage", "Please upload an animal photo first.", false);
            return;
        }

        const submitButton = document.getElementById("aiRescueSubmitBtn");
        const resultBox = document.getElementById("aiRescueResult");

        const formData = new FormData();
        formData.append("situation", document.getElementById("aiSituation").value.trim());
        formData.append("image", file);

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "🔎 Analysing photo...";
        }

        showMessage("aiRescueMessage", "The photo is being analysed. Please wait...", true);
        if (resultBox) resultBox.classList.add("hidden");

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/ai/rescue-guidance`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: formData
                }
            );

            let data = null;
            try { data = await response.json(); } catch (_) {}

            if (!response.ok) {
                throw new Error(data?.detail || "Unable to get AI rescue guidance");
            }

            document.getElementById("aiObservations").textContent =
                data.observations || "The image could not be assessed clearly.";

            renderAiList("aiImmediateSteps", data.immediate_steps);
            renderAiList("aiAvoidSteps", data.avoid_steps);

            document.getElementById("aiUrgentHelp").textContent =
                data.urgent_help || "Contact a veterinarian if the animal appears seriously injured or distressed.";

            if (resultBox) resultBox.classList.remove("hidden");
            showMessage("aiRescueMessage", "AI guidance is ready. Please use your judgement and contact a vet when the animal is seriously unwell or injured.", true);
        } catch (error) {
            showMessage("aiRescueMessage", error.message, false);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "🔎 Analyse & Get First Aid Guidance";
            }
        }
    });
}

// ================================
// BROWSER / IN-APP NOTIFICATIONS
// ================================

let notificationIdsSeen = null;

function showNotificationToast(title, message) {
    const existing = document.getElementById("resqpawsToast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "resqpawsToast";
    toast.className = "resqpaws-toast";
    toast.innerHTML = `
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(message)}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(function () {
        toast.classList.add("hide");
        setTimeout(function () { toast.remove(); }, 250);
    }, 4500);
}

function notifyBrowser(title, message) {
    showNotificationToast(title, message);

    if ("Notification" in window && Notification.permission === "granted") {
        try {
            new Notification(title, { body: message });
        } catch (_) {}
    }
}

function requestBrowserNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
        Notification.requestPermission().catch(function () {});
    }
}

function formatStatus(status) {

    const labels = {

        reported: "🚨 Reported",

        accepted: "🙋 Accepted",

        rescue_started: "🚑 Rescue Started",

        vet_assistance: "🩺 Vet Assistance",

        treatment: "💊 Treatment",

        resolved: "✅ Resolved"
    };

    return labels[status] || status;
}


// ================================
// ESCAPE HTML
// ================================

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ================================
// BUTTON NAVIGATION
// ================================

const heroReportBtn =
    document.getElementById("heroReportBtn");

if (heroReportBtn) {
    heroReportBtn.addEventListener("click", function () {

        document
            .getElementById("report")
            .scrollIntoView({
                behavior: "smooth"
            });

    });
}


const heroRequestBtn =
    document.getElementById("heroRequestBtn");

if (heroRequestBtn) {
    heroRequestBtn.addEventListener("click", function () {

        document
            .getElementById("howItWorks")
            .scrollIntoView({
                behavior: "smooth"
            });

    });
}


// ================================
// INITIAL LOAD
// ================================

updateAuthUI();

if (token) {
    loadCurrentUser();
}

// ================================
// CURRENT LOCATION + ADDRESS
// ================================

const currentLocationBtn =
    document.getElementById("currentLocationBtn");

if (currentLocationBtn) {

    currentLocationBtn.addEventListener(
        "click",
        function () {

            const message =
                document.getElementById("locationMessage");


            if (!navigator.geolocation) {

                showMessage(
                    "locationMessage",
                    "Geolocation is not supported by this browser.",
                    false
                );

                return;
            }


            showMessage(
                "locationMessage",
                "📍 Detecting your location...",
                true
            );


            currentLocationBtn.disabled = true;
            currentLocationBtn.textContent =
                "📍 Detecting Location...";


            navigator.geolocation.getCurrentPosition(

                async function (position) {

                    const latitude =
                        position.coords.latitude;

                    const longitude =
                        position.coords.longitude;


                    // Fill coordinates

                    document
                        .getElementById("rescueLatitude")
                        .value = latitude.toFixed(6);

                    document
                        .getElementById("rescueLongitude")
                        .value = longitude.toFixed(6);



                    showMessage(
                        "locationMessage",
                        "✅ Location detected. Finding address...",
                        true
                    );


                    // Reverse geocoding

                    try {

                        const response =
                            await fetch(
                                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
                            );


                        if (!response.ok) {
                            throw new Error(
                                "Address lookup failed"
                            );
                        }


                        const data =
                            await response.json();


                        const readableAddress =
                            data.display_name ||
                            `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

                        const rescueLocationInput =
                            document.getElementById("rescueLocation");

                        if (rescueLocationInput) {
                            rescueLocationInput.value = readableAddress;
                        }


                        showMessage(
                            "locationMessage",
                            "✅ Location detected successfully.",
                            true
                        );

                    }

                    catch (error) {

                        console.error(
                            "Reverse geocoding error:",
                            error
                        );

                        const rescueLocationInput =
                            document.getElementById("rescueLocation");

                        if (rescueLocationInput) {
                            rescueLocationInput.value =
                                `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                        }


                        showMessage(
                            "locationMessage",
                            "✅ Location detected. Address could not be loaded.",
                            true
                        );
                    }


                    currentLocationBtn.disabled = false;

                    currentLocationBtn.textContent =
                        "📍 Use My Current Location";
                },


                function (error) {

                    let errorMessage =
                        "Unable to get your location.";


                    if (error.code === 1) {

                        errorMessage =
                            "Location permission was denied. Please allow location access.";
                    }


                    if (error.code === 2) {

                        errorMessage =
                            "Your location is currently unavailable. Please try again.";
                    }


                    if (error.code === 3) {

                        errorMessage =
                            "Location request timed out. Please try again.";
                    }


                    showMessage(
                        "locationMessage",
                        errorMessage,
                        false
                    );


                    currentLocationBtn.disabled = false;

                    currentLocationBtn.textContent =
                        "📍 Use My Current Location";
                },


                {
                    enableHighAccuracy: false,
                    timeout: 30000,
                    maximumAge: 60000
                }
            );
        }
    );
}

// ================================
// NEARBY RESCUE REQUESTS
// ================================

async function loadNearbyRescues() {

    if (!token || !currentUser) {
        return;
    }

    if (
        !["volunteer", "ngo", "vet"]
            .includes(currentUser.role)
    ) {
        return;
    }

    const container =
        document.getElementById(
            "nearbyRescueList"
        );

    if (!container) {
        return;
    }

    try {

        const rescues =
            await apiRequest(
                "/api/volunteers/me/nearby-rescues"
            );

        if (!rescues.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <p>
                        🐾 No nearby rescue requests
                        right now.
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            rescues.map(rescue => `

                <div class="rescue-card nearby-rescue-card">

                    <div class="rescue-card-header">

                        <div>

                            <p class="rescue-card-label">
                                RESCUE REQUEST
                            </p>

                            <h3>
                                🐾
                                ${escapeHtml(
                                    rescue.animal_type
                                )}
                            </h3>

                        </div>

                        <span class="status-badge">
                            ${escapeHtml(
                                formatStatus(
                                    rescue.status
                                )
                            )}
                        </span>

                    </div>


                    <div class="rescue-info-section">

                        <span class="info-label">
                            📝 DESCRIPTION
                        </span>

                        <p class="rescue-description">
                            ${escapeHtml(
                                rescue.description
                            )}
                        </p>

                    </div>

                    ${renderPhotoGallery(rescue.photo_urls)}


                    <div class="rescue-location-card">

                        <span class="info-label">
                            📍 LOCATION
                        </span>

                        <p class="location-name">
                            ${escapeHtml(
                                rescue.location
                            )}
                        </p>

                        <p class="distance-text">
                            📏
                            ${rescue.distance_km}
                            km away
                        </p>

                        <div class="map-actions">

                            <button
                                class="secondary-btn"
                                onclick="openRescueLocation(
                                    ${rescue.latitude},
                                    ${rescue.longitude}
                                )">
                                🗺️ View Location
                            </button>

                            <button
                                class="secondary-btn"
                                onclick="getDirectionsToRescue(
                                    ${rescue.latitude},
                                    ${rescue.longitude}
                                )">
                                🧭 Get Directions
                            </button>

                        </div>

                    </div>


                    <div class="rescue-meta">

                        <span class="emergency-level">
                            🚨
                            ${escapeHtml(
                                rescue.emergency_level
                            ).toUpperCase()}
                            EMERGENCY
                        </span>

                    </div>


                    <div class="rescue-actions">

                        <button
                            class="primary-btn"
                            onclick="respondToRescue(
                                ${rescue.id}
                            )">
                            🙋 I Can Help
                        </button>

                    </div>

                </div>

            `).join("");

    } catch (error) {

        console.error(
            "Nearby rescue loading error:",
            error
        );

        container.innerHTML = `
            <div class="empty-state">
                Unable to load nearby rescues.
            </div>
        `;
    }
}

// ================================
// GET CURRENT VOLUNTEER LOCATION
// ================================

function getCurrentVolunteerLocation() {

    return new Promise((resolve, reject) => {

        if (!navigator.geolocation) {
            reject(
                new Error(
                    "Geolocation is not supported by this browser."
                )
            );

            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {

                resolve({
                    latitude:
                        position.coords.latitude,

                    longitude:
                        position.coords.longitude
                });

            },

            error => {

                reject(
                    new Error(
                        "Please allow location access to go online."
                    )
                );
            },

            {
                enableHighAccuracy: false,
                timeout: 30000,
                maximumAge: 60000
            }
        );
    });
}
// ================================
// NEARBY HELPERS
// ================================

const findNearbyHelpersBtn =
    document.getElementById("findNearbyHelpersBtn");

const nearbyHelpersStatus =
    document.getElementById("nearbyHelpersStatus");

const nearbyHelpersList =
    document.getElementById("nearbyHelpersList");


async function loadNearbyHelpers(
    latitude,
    longitude
) {

    if (!nearbyHelpersList) return;

    nearbyHelpersList.innerHTML = `
        <div class="empty-state">
            Finding nearby helpers...
        </div>
    `;

    try {

        const response = await fetch(
            `${API_BASE_URL}/api/helpers/nearby?latitude=${latitude}&longitude=${longitude}&radius_km=10`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                "Unable to load nearby helpers"
            );
        }

        const helpers =
            await response.json();


        if (!helpers || helpers.length === 0) {

            nearbyHelpersList.innerHTML = `
                <div class="empty-state">
                    No rescue helpers found within 10 km.
                </div>
            `;

            return;
        }


        nearbyHelpersList.innerHTML =
            helpers.map(function (helper) {

                let icon = "🧑‍🚒";
                let roleName = "Volunteer";

                if (helper.role === "ngo") {
                    icon = "🏢";
                    roleName = "NGO";
                }

                if (helper.role === "vet") {
                    icon = "🏥";
                    roleName = "Veterinary Hospital";
                }


                const displayName =
                    helper.organization_name ||
                    helper.full_name;


                const availability =
                    helper.is_available
                        ? `<span class="helper-available">🟢 Available</span>`
                        : `<span class="helper-offline">⚪ Offline</span>`;


                const emergency =
                    helper.emergency_available
                        ? `
                            <span class="helper-emergency">
                                🚨 Emergency Available
                            </span>
                          `
                        : "";


                const services =
                    helper.services
                        ? `
                            <div class="helper-info">
                                🩺 ${helper.services}
                            </div>
                          `
                        : "";


                const phone =
                    helper.phone
                        ? `
                            <div class="helper-info">
                                📞 ${helper.phone}
                            </div>
                          `
                        : "";


                const location =
                    helper.location
                        ? `
                            <div class="helper-info">
                                📍 ${helper.location}
                            </div>
                          `
                        : "";


                const mapUrl =
                    `https://www.google.com/maps/dir/?api=1&destination=${helper.latitude},${helper.longitude}`;


                return `
                    <div class="nearby-helper-card">

                        <div class="helper-card-header">

                            <div class="helper-icon">
                                ${icon}
                            </div>

                            <div class="helper-title">

                                <h3>
                                    ${displayName}
                                </h3>

                                <span class="helper-role">
                                    ${roleName}
                                </span>

                            </div>

                        </div>


                        <div class="helper-distance">
                            📍 ${helper.distance_km} km away
                        </div>


                        <div class="helper-status-row">

                            ${availability}

                            ${emergency}

                        </div>


                        ${phone}

                        ${location}

                        ${services}


                        <div class="helper-actions">

                            ${
                                helper.phone
                                ? `
                                    <a
                                        href="tel:${helper.phone}"
                                        class="helper-action-btn"
                                    >
                                        📞 Contact
                                    </a>
                                  `
                                : ""
                            }

                            <a
                                href="${mapUrl}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="helper-action-btn map-btn"
                            >
                                🗺️ View Map
                            </a>

                        </div>

                    </div>
                `;

            }).join("");


    } catch (error) {

        console.error(
            "Nearby helpers error:",
            error
        );

        nearbyHelpersList.innerHTML = `
            <div class="empty-state">
                Unable to load nearby helpers.
            </div>
        `;
    }
}


if (findNearbyHelpersBtn) {

    findNearbyHelpersBtn.addEventListener(
        "click",
        function () {

            if (!token) {

                nearbyHelpersStatus.textContent =
                    "Please login first.";

                return;
            }


            if (!navigator.geolocation) {

                nearbyHelpersStatus.textContent =
                    "Location is not supported by this browser.";

                return;
            }


            nearbyHelpersStatus.textContent =
                "Getting your location...";

            findNearbyHelpersBtn.disabled = true;


            navigator.geolocation.getCurrentPosition(

                async function (position) {

                    const latitude =
                        position.coords.latitude;

                    const longitude =
                        position.coords.longitude;


                    nearbyHelpersStatus.textContent =
                        "📍 Searching within 10 km...";


                    await loadNearbyHelpers(
                        latitude,
                        longitude
                    );


                    nearbyHelpersStatus.textContent =
                        "📍 Showing helpers within 10 km";

                    findNearbyHelpersBtn.disabled =
                        false;
                },


                function (error) {

                    console.error(
                        "Nearby helper location error:",
                        error
                    );

                    nearbyHelpersStatus.textContent =
                        "Unable to get your location.";

                    findNearbyHelpersBtn.disabled =
                        false;
                }
            );
        }
    );
}
// =================================
// NAV MENU OPEN / CLOSE
// =================================

const menuToggleBtn =
    document.getElementById("menuToggleBtn");

const navMenu =
    document.getElementById("navMenu");


if (menuToggleBtn && navMenu) {

    menuToggleBtn.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();

            navMenu.classList.toggle(
                "hidden"
            );

        }
    );


    navMenu.addEventListener(
        "click",
        function (event) {
            event.stopPropagation();
        }
    );


    document.addEventListener(
        "click",
        function () {

            navMenu.classList.add(
                "hidden"
            );

        }
    );

}
document
    .querySelectorAll("#navMenu a")
    .forEach(function (link) {

        link.addEventListener(
            "click",
            function () {

                navMenu.classList.add(
                    "hidden"
                );

            }
        );

    });