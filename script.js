document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Dashboard Initialized");

    // 1. Initialize System
    initNavigation();
    initSidebar();
    initRippleEffect();
    initToasts();

    // 2. Load User Profile (THIS IS NEW)
    loadUserProfile();

    // 3. Set Initial View
    switchView('dashboard', document.querySelector('.nav-link.active'));
    switchStepperStep(1);
    initProfileMenu();
    handleWelcomeSequence();
    loadDashboardRealData();


    loadLiveActivityTable();
    loadAllCandidatesTable(); // Load real candidates
});


// 1. VAPI CONFIGURATION (PASTE YOUR REAL IDs HERE)
const VAPI_CONFIG = {
    agents: {
        'aanya': { id: "25568a84-2428-4f17-b8c9-17fb5ed8ea2d", name: "Aanya", role: "HR Specialist" },
        'rohan': { id: "78334ae7-eee5-41ea-a1f6-53e93ccb456c", name: "Rohan", role: "Tech Lead" },
        'kavya': { id: "2128baf8-b20b-4eae-a219-c69e81e08241", name: "Kavya", role: "Cultural Fit" }
    },
    voices: {
        // Indian Accents
        'en-IN-Neural2-A': "ZpfauF9kCS0SBbhMqc3i",
        'en-IN-Neural2-D': "fooWT6UekrufC2qHLDa3",
        'en-IN-Wavenet-C': "90ipbRoKi4CpHXvKVtl0",

        // US/UK Accents
        'en-US-Neural2-F': "nf4MCGNSdM0hxM95ZBQR",
        'en-US-Polyglot-1': "rW2lcIFbB5AVdzWcOG9n",
        'en-GB-Neural2-B': "GHKbgpqchXOxta6X2lSd",

        // Hindi/Regional
        'hi-IN-Neural2-A': "6p0P6gezgvY1v6xbLzmU"
    }
};

// 2. GLOBAL STATE VARIABLES
// (These must be outside functions so they don't disappear)
window.currentConfig = {
    agentId: null,
    agentName: "Aanya",
    voiceId: null,
    language: "English (US)",
    strictness: "Balanced",
    interviewMode: "Technical"
};

window.currentGeneratedBlueprint = null;


let candidateIdToDelete = null;
let candidateRowToDelete = null;

function initProfileMenu() {
    const profileBtn = document.getElementById('userProfileBtn');
    const profileMenu = document.getElementById('profileMenu');

    if (!profileBtn || !profileMenu) return;

    // Toggle Menu on Click
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent immediate closing
        profileMenu.classList.toggle('show');
        profileBtn.classList.toggle('active'); // Rotates the arrow
    });

    // Close Menu when clicking anywhere else
    document.addEventListener('click', (e) => {
        if (!profileMenu.contains(e.target) && !profileBtn.contains(e.target)) {
            profileMenu.classList.remove('show');
            profileBtn.classList.remove('active');
        }
    });
}

async function loadUserProfile() {
    try {
        const response = await fetch('/api/me');
        const user = await response.json();

        if (user.error) return;

        /* --- 1. UPDATE SIDEBAR --- */
        const sbName = document.querySelector('.user-info h4');
        if (sbName) sbName.textContent = user.name;

        const sbAvatar = document.querySelector('.user-profile .avatar');
        if (sbAvatar && user.picture) {
            sbAvatar.innerHTML = `
                <img src="${user.picture}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
                <div class="status-indicator"></div>
            `;
            sbAvatar.style.background = 'transparent';
            sbAvatar.style.border = 'none';
        }

        /* --- 2. UPDATE SETTINGS / PROFILE PAGE (The New Part) --- */

        // Header Section
        const pageName = document.getElementById('settings-name');
        const pageEmail = document.getElementById('settings-email');
        const pageAvatar = document.getElementById('settings-avatar');

        if (pageName) pageName.textContent = user.name;
        if (pageEmail) pageEmail.textContent = user.email;
        if (pageAvatar && user.picture) pageAvatar.src = user.picture;

        // Form Inputs
        const inputName = document.getElementById('input-name');
        const inputEmail = document.getElementById('input-email');

        if (inputName) inputName.value = user.name;
        if (inputEmail) inputEmail.value = user.email;

    } catch (error) {
        console.error("Failed to load user profile:", error);
    }
}

// --- Navigation Logic ---
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));

            // Add active class to clicked link
            link.classList.add('active');

            // Get view ID from onclick attribute
            const onclickAttr = link.getAttribute('onclick');
            let viewId = 'dashboard';

            if (onclickAttr) {
                const match = onclickAttr.match(/'([^']+)'/);
                if (match) viewId = match[1];
            }

            switchView(viewId);
        });
    });
}

/**
 * Manages the visibility of the main content views and triggers specific actions 
 * like header display and campaign loading based on the target view ID.
 * * @param {string} viewId The ID of the section to show (e.g., 'dashboard', 'campaigns', 'video-assistant').
 */
function switchView(viewId) {
    // 1. Hide all views
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });

    // 2. Show target view
    const targetSection = document.getElementById(viewId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // 3. Update Page Title (Optional: Title is hidden in campaign/settings views)
    const titles = {
        'dashboard': 'Dashboard Overview',
        'candidates': 'Candidates & Call History',
        'reports': 'Campaign Reports',
        'campaigns': 'AI Interview Campaign Builder',
        'video-assistant': 'AI Video Assistant',
        'settings': 'Account Settings'
    };

    const titleElement = document.getElementById('page-title');
    if (titleElement && titles[viewId]) {
        titleElement.textContent = titles[viewId];
    }

    // 4. Handle Layout (Header & Padding)
    const contentArea = document.getElementById('content-area');
    const topHeader = document.querySelector('.top-header');

    if (viewId === 'dashboard' || viewId === 'settings') {
        // --- DASHBOARD & SETTINGS: Simple Views, No Header ---
        if (topHeader) topHeader.style.display = 'none';
        if (contentArea) contentArea.classList.remove('campaigns-view-active');

    } else if (viewId === 'campaigns') {
        // --- AUDIO CAMPAIGNS: Full-screen Builder ---
        if (topHeader) topHeader.style.display = 'none';
        if (contentArea) contentArea.classList.add('campaigns-view-active');

        // Load Audio Campaigns
        loadUserCampaigns('audio');

    } else if (viewId === 'video-assistant') {
        // --- VIDEO CAMPAIGNS: Full-screen Builder + Coming Soon Animation ---
        if (topHeader) topHeader.style.display = 'none';
        if (contentArea) contentArea.classList.add('campaigns-view-active');

        // Load Video Campaigns (If implemented later)
        // loadUserCampaigns('video'); 

        // Trigger the star field animation for the Coming Soon screen
        // (200 stars, min speed 8s, max speed 15s)
        createStars(200, 8, 15, 'video-assistant');

    } else {
        // --- STANDARD VIEWS (Candidates, Reports): Show Header ---
        if (topHeader) {
            topHeader.style.display = 'flex';
            topHeader.classList.add('header-bordered');
        }
        if (contentArea) contentArea.classList.remove('campaigns-view-active');
    }
}
// --- Stepper Switcher (Horizontal Layout) ---
function switchStepperStep(stepNumber) {
    // 1. Deactivate all navigation items and panes
    document.querySelectorAll('#campaigns .stepper-nav .step-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelectorAll('#campaigns .stepper-content-wrapper .stepper-pane').forEach(pane => {
        pane.classList.remove('active');
    });

    // 2. Activate the target navigation item
    const targetNav = document.getElementById(`step-nav-${stepNumber}`);
    if (targetNav) {
        targetNav.classList.add('active');
    }

    // 3. Activate the target content pane
    const targetPane = document.getElementById(`step-pane-${stepNumber}`);
    if (targetPane) {
        targetPane.classList.add('active');
    }

    // 4. Highlight lines for completed steps (visual check)
    document.querySelectorAll('#campaigns .stepper-nav .step-item').forEach((item, index) => {
        // index is 0-based, stepNumber is 1-based
        if (index < stepNumber - 1) {
            item.classList.add('completed');
        } else {
            item.classList.remove('completed');
        }
    });
}

// --- Campaign List Logic ---
function selectCampaign(element, campaignName) {
    // 1. Update visual selection
    document.querySelectorAll('.campaign-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');

    // 2. Update Header
    document.getElementById('current-campaign-title').textContent = campaignName;

    // 3. Mock: update the input field for Step 1
    const campaignNameInput = document.querySelector('#step-pane-1 input[type="text"]');
    if (campaignNameInput) {
        campaignNameInput.value = campaignName;
    }

    showToast(`Selected campaign: ${campaignName}`, 'info');
    // 4. Reset stepper to first step 
    switchStepperStep(1);
}

function createNewCampaign() {
    document.querySelectorAll('.campaign-item').forEach(item => item.classList.remove('active'));

    const newCampaignTitle = 'Untitled New Campaign';
    document.getElementById('current-campaign-title').textContent = newCampaignTitle;

    // Clear form and reset stepper (Mock form clearing)
    const campaignNameInput = document.querySelector('#step-pane-1 input[type="text"]');
    if (campaignNameInput) campaignNameInput.value = newCampaignTitle;

    document.querySelector('#step-pane-1 textarea').value = '';
    document.querySelector('#step-pane-4 textarea').value = '';

    showToast('Initiating new campaign creation...', 'info');
    switchStepperStep(1);
}

// --- Reports Logic (Mock) ---
function updateCampaignStats(campaignValue) {
    // Mock logic to simulate data changing when campaign changes
    const stats = {
        'q4': { selected: 42, rejected: 18, pending: 156 },
        'tech': { selected: 12, rejected: 5, pending: 45 },
        'intern': { selected: 85, rejected: 30, pending: 210 }
    };

    const data = stats[campaignValue] || stats['q4'];

    // Update DOM elements
    document.getElementById('stat-selected').textContent = data.selected;
    document.getElementById('stat-rejected').textContent = data.rejected;
    document.getElementById('stat-pending').textContent = data.pending;

    showToast(`Loaded data for campaign: ${campaignValue.toUpperCase()}`, 'info');
}

function exportCampaignData() {
    // Mock CSV export
    showToast('Preparing CSV download...', 'info');
    setTimeout(() => {
        showToast('Report downloaded successfully!', 'success');
    }, 1500);
}

// --- Sidebar Toggle ---
function initSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
}

// --- Ripple Effect ---
function initRippleEffect() {
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            this.style.transform = 'scale(0.98)'; // Smaller scale change
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 100);
        });
    });
}

// --- Toast Notification System ---
function initToasts() {
    if (!document.querySelector('.toast-container')) {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
}

function showToast(message, type = 'success') {
    const container = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast`;

    let icon = 'fa-check-circle';
    let color = 'var(--success-text)';

    if (type === 'error') {
        icon = 'fa-exclamation-circle';
        color = 'var(--danger-text)';
        toast.style.borderLeftColor = 'var(--danger)';
    } else if (type === 'info') {
        icon = 'fa-info-circle';
        color = 'var(--primary-600)';
        toast.style.borderLeftColor = 'var(--primary-600)';
    }

    toast.innerHTML = `
        <i class="fa-solid ${icon} toast-icon" style="color: ${color}"></i>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}





// --- LOAD CAMPAIGN DATA (Corrected) ---
async function selectVapiCampaign(element, title, campaignId) {
    // 1. UI Updates
    document.querySelectorAll('.vapi-list-item').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');

    const titleEl = document.getElementById('vapi-campaign-title');
    if (titleEl) titleEl.textContent = title;

    // 2. Set Active Global ID
    activeCampaignId = campaignId;

    // 3. Clear Table & Show Loading
    const tbody = document.getElementById('candidates-list-body');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:gray;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';

    try {
        // 4. Fetch Campaign Config and Status first
        const campRes = await fetch(`/api/campaigns/${campaignId}`);
        const campData = await campRes.json();

        const status = campData.status || 'In Design';

        // 5. Fetch Candidates from DB
        const candRes = await fetch(`/api/campaigns/${campaignId}/candidates`);
        const candData = await candRes.json();

        // Clear Loading Spinner
        tbody.innerHTML = '';

        // CRITICAL: Only display candidates if campaign is "In Design"
        if (status === 'In Design') {
            if (candData.candidates && candData.candidates.length > 0) {
                candData.candidates.forEach(c => {
                    // ✅ FIX IS HERE: We pass c.id as the 4th argument
                    addCandidateRowToUI(c.name, c.phone, c.email, c.id);
                });
                document.getElementById('candidate-count').innerText = candData.candidates.length;
            } else {
                // Empty State
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="empty-state-row">
                            <i class="fa-solid fa-users-slash"></i>
                            <span>No candidates added yet.</span>
                        </td>
                    </tr>
                `;
                document.getElementById('candidate-count').innerText = "0";
            }
        } else {
            // For Active/Stopped campaigns, show empty state (ready for new additions)
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state-row">
                        <i class="fa-solid fa-plus-circle"></i>
                        <span>Ready to add new candidates to this ${status.toLowerCase()} campaign.</span>
                    </td>
                </tr>
            `;
            document.getElementById('candidate-count').innerText = "0";
        }

        if (campData.config) {
            if (campData.config.company_name) document.getElementById('sb-company').value = campData.config.company_name;
            if (campData.config.job_role) document.getElementById('sb-job-role').value = campData.config.job_role;
            if (campData.config.description) document.getElementById('sb-description').value = campData.config.description;
        }

        // 6. Update UI based on campaign status
        updateHeaderButtons(status);
        updateTabVisibility(status);

        // 7. If campaign is active, auto-navigate to Reports tab
        if (status === 'Active') {
            switchHrTab('tab-reports', document.querySelector('[onclick*="tab-reports"]'));
        }

    } catch (e) {
        console.error("Error loading campaign data:", e);
    }
}

function switchVapiTab(element) {
    document.querySelectorAll('.vapi-tab').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    // In a real app, this would toggle visibility of the form sections below
}



// --- New HR Dashboard Logic ---

// Switch between the new HR tabs (Candidates, Structure, etc.)
function switchHrTab(tabId, tabElement) {
    // 1. Reset all tabs
    document.querySelectorAll('.vapi-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.hr-tab-content').forEach(el => el.classList.remove('active'));

    // 2. Activate clicked tab
    tabElement.classList.add('active');
    document.getElementById(tabId).classList.add('active');

    // 3. Load data for specific tabs
    if (tabId === 'tab-reports') {
        // Load campaign reports when Reports tab is opened
        loadCampaignReports();
    }
}

// Remove the old selectRound function and add this:

function selectOption(element, containerId) {
    // 1. Find the container (either mode-selection or time-selection)
    const container = document.getElementById(containerId);

    // 2. Remove 'selected' class from ALL cards strictly within that container
    const siblings = container.querySelectorAll('.round-option-card');
    siblings.forEach(card => card.classList.remove('selected'));

    // 3. Add 'selected' class to the clicked card
    element.classList.add('selected');

    // 4. Optional: Toast for feedback
    const title = element.querySelector('.card-title').innerText;
    // Don't spam toasts, just console log or subtle effect
    console.log(`Selected ${title}`);
}







// Expose functions globally
window.switchView = switchView;
window.showToast = showToast;
window.updateCampaignStats = updateCampaignStats;
window.exportCampaignData = exportCampaignData;
window.switchStepperStep = switchStepperStep;
window.selectCampaign = selectCampaign;
window.createNewCampaign = createNewCampaign;









async function loadUserCampaigns(type = 'audio') {
    try {
        const response = await fetch('/api/campaigns');
        const data = await response.json();

        if (data.campaigns) {
            // Filter: Show only the requested type (Audio or Video)
            // If DB has no type field, assume it's 'audio'
            const filtered = data.campaigns.filter(c =>
                (c.type === type) || (!c.type && type === 'audio')
            );
            populateCampaignsSidebar(filtered, type);

            // NEW: Auto-select first Active campaign or most recent campaign
            if (filtered.length > 0 && !activeCampaignId) {
                // Prioritize Active campaigns, then fall back to the first (most recent) campaign
                const campaignToSelect = filtered.find(c => c.status === 'Active') || filtered[0];

                // Find the corresponding list item in the sidebar
                const listItem = document.querySelector(`.vapi-list-item[onclick*="${campaignToSelect.id}"]`);
                if (listItem) {
                    // Trigger selection to load campaign data and restore UI state
                    selectVapiCampaign(listItem, campaignToSelect.name, campaignToSelect.id);
                }
            }
        }
    } catch (error) {
        console.error("Failed to load campaigns:", error);
    }
}


let activeCampaignId = null;
let activeCampaignStatus = 'In Design'; // Track current campaign status
let stagedCandidates = []; // Temporary array for Active campaigns

// --- UPDATED POPULATE FUNCTION ---
function populateCampaignsSidebar(campaigns, type) {
    let listId = type === 'video' ? 'video-list-container' : 'campaigns-list-container';
    let blankId = type === 'video' ? 'video-blank-state' : 'campaign-blank-state';
    let contentId = type === 'video' ? 'video-builder-content' : 'campaign-builder-content';
    let titleId = type === 'video' ? 'video-campaign-title' : 'vapi-campaign-title';

    const container = document.getElementById(listId);
    const blankState = document.getElementById(blankId);
    const builderContent = document.getElementById(contentId);

    if (!container) return;
    container.innerHTML = '';

    // Handle Empty State
    if (campaigns.length === 0) {
        if (builderContent) builderContent.style.display = 'none';
        if (blankState) blankState.style.display = 'flex';
        activeCampaignId = null;
        return;
    }

    if (builderContent) builderContent.style.display = 'flex';
    if (blankState) blankState.style.display = 'none';

    campaigns.forEach((campaign, index) => {
        const isActive = index === 0 ? ' active' : '';
        const el = document.createElement('div');
        el.className = `vapi-list-item${isActive}`;

        // Auto-select first item logic (Same as before)
        if (index === 0) {
            selectVapiCampaign(null, campaign.name, campaign.id);
            // We pass null as element initially, then add active class below
        }

        // Click Event: Select Campaign
        el.onclick = (e) => {
            selectVapiCampaign(el, campaign.name, campaign.id);
        };

        // Inner HTML: Name + Delete Button
        // Note: onclick="deleteCampaign(...)" includes event.stopPropagation() 
        // to prevent selecting the campaign when trying to delete it.
        el.innerHTML = `
            <div>
                <span class="vapi-item-name">${campaign.name}</span>
                <span class="vapi-item-id">#${campaign.id.substring(0, 8)}</span>
            </div>
            <button class="btn-delete-campaign" onclick="deleteCampaign(event, '${campaign.id}', '${type}')" title="Delete Campaign">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;

        container.appendChild(el);
    });
}

// --- NEW: Handle Campaign Creation Flow ---
// Update Modal to accept type
function showCreateCampaignModal(type = 'audio') {
    const label = type === 'video' ? "Video" : "Audio";
    const campaignName = prompt(`Enter name for new ${label} Campaign:`);

    if (campaignName && campaignName.trim() !== "") {
        createCampaignAPI(campaignName.trim(), type);
    }
}

async function createCampaignAPI(name, type) {
    showToast(`Creating ${type} campaign...`, 'info');
    try {
        const response = await fetch('/api/campaigns/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, type: type }) // Send Type!
        });

        if (!response.ok) throw new Error('Failed');

        showToast('Created successfully!', 'success');

        // Reload only the relevant list
        await loadUserCampaigns(type);

    } catch (error) {
        console.error(error);
        showToast("Error creating campaign.", 'error');
    }
}


/**
 * Creates and animates stars in a specified container.
 * * @param {number} numStars The total number of stars to generate (e.g., 50 to 200).
 * @param {number} minSpeed The minimum animation duration in seconds (shorter = faster).
 * @param {number} maxSpeed The maximum animation duration in seconds.
 * @param {string} containerId The ID of the parent view section (e.g., 'video-assistant').
 */
function createStars(numStars, minSpeed, maxSpeed, containerId = 'video-assistant') {
    const starContainer = document.querySelector(`#${containerId} .stars-background`);
    if (!starContainer) return;

    // Clear existing stars to prevent duplicates
    starContainer.innerHTML = '';

    for (let i = 0; i < numStars; i++) {
        const star = document.createElement('div');
        star.className = 'star';

        // Random position (using viewport units for whole-page coverage)
        const x = Math.random() * 100; // % width
        const y = Math.random() * 100; // % height
        star.style.left = `${x}vw`;
        star.style.top = `${y}vh`;

        // Random size (1px to 4px)
        const size = Math.random() * 3 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;

        // Random animation duration and delay (Controlling Speed)
        // Duration is between minSpeed and maxSpeed
        const duration = Math.random() * (maxSpeed - minSpeed) + minSpeed;
        const delay = Math.random() * (minSpeed * 0.5); // Delay is max 50% of minSpeed

        star.style.animationDuration = `${duration}s`;
        star.style.animationDelay = `${delay}s`;

        starContainer.appendChild(star);
    }
}
// Update API call to send type
async function createNewCampaign(campaignName, type) {
    showToast(`Creating ${type} campaign...`, 'info');

    try {
        const response = await fetch('/api/campaigns/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // SEND TYPE TO BACKEND
            body: JSON.stringify({ name: campaignName, type: type })
        });

        if (!response.ok) throw new Error('Failed');

        const result = await response.json();
        showToast('Created successfully!', 'success');

        // Reload the specific list we just added to
        await loadUserCampaigns(type);

    } catch (error) {
        console.error(error);
        showToast("Failed to create campaign.", 'error');
    }
}

// --- LOAD CAMPAIGN DATA (Updated) ---
async function selectVapiCampaign(element, title, campaignId) {
    // 1. UI Updates
    document.querySelectorAll('.vapi-list-item').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');
    document.getElementById('vapi-campaign-title').textContent = title;

    // 2. Reset Tabs to Default (Source Data tab)
    document.querySelectorAll('.vapi-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.hr-tab-content').forEach(el => el.classList.remove('active'));

    // Activate default tab (Source Data)
    const defaultTab = document.querySelector('.vapi-tab[onclick*="tab-candidates"]');
    const defaultContent = document.getElementById('tab-candidates');
    if (defaultTab) defaultTab.classList.add('active');
    if (defaultContent) defaultContent.classList.add('active');

    // 3. Set Active Global ID
    activeCampaignId = campaignId;

    // REMOVED THE TOAST HERE as requested
    // showToast(...); <--- Deleted

    try {
        // 3. Fetch Campaign Config first to check status
        const campRes = await fetch(`/api/campaigns/${campaignId}`);
        const campData = await campRes.json();

        // 4. Check campaign status
        const campaignStatus = campData.status || 'In Design';
        console.log(`📋 Campaign Status: ${campaignStatus}`);

        // Store status globally for use in add functions
        activeCampaignStatus = campaignStatus;

        // Clear staging area when switching campaigns
        stagedCandidates = [];

        // 5. Fetch Candidates from DB
        const candRes = await fetch(`/api/campaigns/${campaignId}/candidates`);
        const candData = await candRes.json();

        // 6. Render Candidates (Source Data Tab) - Only show for "In Design" status
        const tbody = document.getElementById('candidates-list-body');
        tbody.innerHTML = '';

        // CRITICAL CHANGE: Only display candidates if campaign is "In Design"
        // For "Active" campaigns, Source Data section should be empty for adding NEW candidates
        if (campaignStatus === 'In Design') {
            if (candData.candidates && candData.candidates.length > 0) {
                candData.candidates.forEach(c => {
                    // Use the UI helper to add row without saving again
                    addCandidateRowToUI(c.name, c.phone, c.email);
                });
                document.getElementById('candidate-count').innerText = candData.candidates.length;
            } else {
                document.getElementById('candidate-count').innerText = "0";
            }
        } else {
            // For Active/Stopped campaigns, show empty state (ready for new additions)
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state-row">
                        <i class="fa-solid fa-plus-circle"></i>
                        <span>Ready to add new candidates to this ${campaignStatus.toLowerCase()} campaign.</span>
                    </td>
                </tr>
            `;
            document.getElementById('candidate-count').innerText = "0";
        }

        // 7. Update UI based on campaign status
        updateHeaderButtons(campaignStatus);
        updateTabVisibility(campaignStatus);

        // Restore saved inputs if they exist
        if (campData.config) {
            if (campData.config.company_name) document.getElementById('sb-company').value = campData.config.company_name;
            if (campData.config.job_role) document.getElementById('sb-job-role').value = campData.config.job_role;
            if (campData.config.description) document.getElementById('sb-description').value = campData.config.description;
        }

    } catch (e) {
        console.error("Error loading campaign data:", e);
    }
}
// Expose the new function globally
window.showCreateCampaignModal = showCreateCampaignModal;
window.selectVapiCampaign = selectVapiCampaign;
window.loadUserCampaigns = loadUserCampaigns;





let extractedCandidates = []; // Temporary storage for Excel data

// 1. Handle File Upload


// --- IN script.js ---
// Find your handleFileUpload function and ensure it looks like this:

async function handleFileUpload(input) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    showToast("Smart-scanning file...", "info");

    try {
        const res = await fetch("/api/parse-candidates", {
            method: "POST",
            body: formData
        });

        const data = await res.json();

        if (data.candidates && data.candidates.length > 0) {
            extractedCandidates = data.candidates;

            // Show Success Message with count
            showToast(`Found ${data.candidates.length} valid candidates (skipped empty phones).`, "success");

            // Populate Popup Preview (Same as before)
            const body = document.getElementById("preview-body");
            body.innerHTML = "";

            data.candidates.slice(0, 5).forEach(c => { // Preview only first 5
                body.innerHTML += `
                    <tr>
                        <td>${c.name}</td>
                        <td class="text-muted">${c.email || '-'}</td>
                        <td class="font-mono text-muted">${c.phone}</td>
                    </tr>
                `;
            });

            // If more than 5, show a note
            if (data.candidates.length > 5) {
                body.innerHTML += `<tr><td colspan="3" style="text-align:center">...and ${data.candidates.length - 5} more</td></tr>`;
            }

            document.getElementById("excelPreviewModal").style.display = "flex";
        } else {
            showToast("No valid candidates found. Check columns or empty rows.", "error");
        }
    } catch (e) {
        console.error(e);
        showToast("Error processing file", "error");
    }
    input.value = "";
}

async function confirmExcelImport() {
    if (extractedCandidates.length === 0) {
        closePreview();
        return;
    }
    if (!activeCampaignId) {
        showToast("Error: No campaign selected.", "error");
        return;
    }

    // Check if campaign is Active - use staging instead of direct save
    if (activeCampaignStatus === 'Active' || activeCampaignStatus === 'Stopped') {
        // Add to staging array
        stagedCandidates.push(...extractedCandidates);

        // Display in UI
        const tbody = document.getElementById('candidates-list-body');

        // Clear empty state if it exists
        const emptyState = tbody.querySelector('.empty-state-row');
        if (emptyState) {
            tbody.innerHTML = '';
        }

        // Add all candidates to UI
        extractedCandidates.forEach(c => {
            addCandidateRowToUI(c.name, c.phone, c.email, null);
        });

        showToast(`${extractedCandidates.length} candidates added to staging. Click 'Add to Campaign' to confirm.`, "success");

        // Clear and close
        extractedCandidates = [];
        closePreview();

        // Show the "Add to Campaign" button
        showAddToCampaignButton();
        return;
    }

    // For "In Design" campaigns, save directly to DB (original behavior)
    const confirmBtn = document.querySelector('#excelPreviewModal .btn-primary');
    let originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Importing...';
    confirmBtn.disabled = true;

    try {
        const response = await fetch("/api/candidates/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                campaign_id: activeCampaignId,
                candidates: extractedCandidates
            })
        });

        const result = await response.json();

        if (response.ok) {
            // Reload the list entirely to get the IDs for the new candidates
            // (This ensures we can delete them immediately without refreshing page)
            const candRes = await fetch(`/api/campaigns/${activeCampaignId}/candidates`);
            const candData = await candRes.json();

            // Clear and Re-render
            const tbody = document.getElementById('candidates-list-body');
            tbody.innerHTML = '';
            candData.candidates.forEach(c => addCandidateRowToUI(c.name, c.phone, c.email, c.id));

            // Show result message
            if (result.skipped > 0) {
                showToast(`Imported ${result.added}. Skipped ${result.skipped} duplicates.`, "warning");
            } else {
                showToast(`Successfully imported ${result.added} candidates!`, "success");
            }

            extractedCandidates = [];
            closePreview();
        } else {
            showToast("Failed to save to database.", "error");
        }
    } catch (e) {
        console.error(e);
        showToast("Network Error", "error");
    } finally {
        if (confirmBtn) {
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
    }
}
// --- ADD MANUAL CANDIDATE (Updated for Staging) ---
async function addManualCandidate() {
    if (!activeCampaignId) {
        showToast("Please select a campaign first.", "error");
        return;
    }

    const nameInput = document.getElementById('manual-name');
    const phoneInput = document.getElementById('manual-phone');
    const emailInput = document.getElementById('manual-email');

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();

    if (!name || !phone) {
        showToast("Name and Phone are required", "error");
        return;
    }

    // Check if campaign is Active - use staging instead of direct save
    if (activeCampaignStatus === 'Active' || activeCampaignStatus === 'Stopped') {
        // Add to staging array
        stagedCandidates.push({ name, phone, email });

        // Display in UI
        addCandidateRowToUI(name, phone, email, null);

        showToast("Candidate added to staging. Click 'Add to Campaign' to confirm.", "success");

        // Clear inputs
        nameInput.value = "";
        phoneInput.value = "";
        emailInput.value = "";

        // Show the "Add to Campaign" button
        showAddToCampaignButton();
        return;
    }

    // For "In Design" campaigns, save directly to DB (original behavior)
    const btn = document.querySelector('.btn-quick-add');
    let originalText = btn.innerHTML;
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;
    }

    try {
        const response = await fetch("/api/candidates/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                campaign_id: activeCampaignId,
                candidates: [{ name, phone, email }]
            })
        });

        const result = await response.json();

        if (response.ok) {
            if (result.added === 0 && result.skipped > 0) {
                showToast("Duplicate phone number. Not added.", "warning");
            } else {
                showToast("Candidate saved successfully!", "success");

                // ✅ CRITICAL FIX: Refresh the list from DB to get the new ID
                // We reuse the selectVapiCampaign logic to reload the active campaign's data
                const currentTitle = document.getElementById('vapi-campaign-title').innerText;
                const activeItem = document.querySelector('.vapi-list-item.active');
                await selectVapiCampaign(activeItem, currentTitle, activeCampaignId);

                // Clear inputs
                nameInput.value = "";
                phoneInput.value = "";
                emailInput.value = "";
            }
        } else {
            showToast(result.detail || "Failed to save candidate.", "error");
        }
    } catch (e) {
        console.error(e);
        showToast("Error connecting to server.", "error");
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}


// 4. Helper: Add Row to Table (The Missing Link)
function addCandidateToTable(name, phone, email) {
    const tbody = document.getElementById('candidates-list-body');
    const countSpan = document.getElementById('candidate-count');

    const row = document.createElement('tr');
    row.innerHTML = `
        <td><strong>${name}</strong></td>
        <td class="font-mono text-muted">${phone || '--'}</td>
        <td class="text-muted">${email || '--'}</td>
        <td style="text-align:right;">
            <button class="btn-vapi-ghost" onclick="this.closest('tr').remove(); updateCount();" style="color: #ef4444; border:none;">
                <i class="fa-solid fa-trash"></i>
            </button>
        </td>
    `;

    tbody.appendChild(row);
    updateCount();
}

// 5. Helper: Update Count
function updateCount() {
    const tbody = document.getElementById('candidates-list-body');
    const count = tbody.children.length;
    document.getElementById('candidate-count').innerText = count;
}

// 6. Close Modal
function closePreview() {
    document.getElementById("excelPreviewModal").style.display = "none";
}

// 6. Close Modal Logic
function closePreview() {
    document.getElementById("excelPreviewModal").style.display = "none";
}

// 3. Render Table
function renderCandidateTable() {
    const tbody = document.getElementById('candidates-list-body');
    const countSpan = document.getElementById('candidate-count');
    tbody.innerHTML = '';

    candidateList.forEach((c, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${c.name}</strong></td>
            <td class="text-muted">${c.phone}</td>
            <td class="text-muted">${c.email}</td>
            <td style="text-align:right;">
                <button class="btn-vapi-ghost" onclick="removeCandidate(${index})" style="color:#ef4444; border:none;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    countSpan.textContent = candidateList.length;
}

function removeCandidate(index) {
    candidateList.splice(index, 1);
    renderCandidateTable();
}


async function generateScriptAI() {
    const text = document.getElementById('context-text').value;
    const fileInput = document.getElementById('context-file');

    if (!text && fileInput.files.length === 0) {
        showToast('Please provide text or upload a PDF', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('context_text', text);
    if (fileInput.files.length > 0) {
        formData.append('file', fileInput.files[0]);
    }

    showToast('AI is generating questions...', 'info');

    try {
        const response = await fetch('/api/generate-questions', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        // Typewriter effect for the result
        const textarea = document.getElementById('generated-script');
        textarea.value = data.questions;
        showToast('Script generated!', 'success');

    } catch (e) {
        showToast('Generation failed', 'error');
    }
}
function closePreview() {
    document.getElementById("excelPreviewModal").style.display = "none";
}

// --- SAVE EXTRACTED CANDIDATES (Import from Excel/CSV - Fixed) ---
async function confirmExcelImport() {
    if (extractedCandidates.length === 0) {
        closePreview();
        return;
    }
    if (!activeCampaignId) {
        showToast("Error: No campaign selected.", "error");
        closePreview();
        return;
    }

    const confirmBtn = document.querySelector('#excelPreviewModal .btn-primary');
    let originalText = "Import Selected";
    if (confirmBtn) {
        originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Importing...';
        confirmBtn.disabled = true;
    }

    try {
        const response = await fetch("/api/candidates/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                campaign_id: activeCampaignId,
                candidates: extractedCandidates
            })
        });

        const result = await response.json();

        if (response.ok) {
            // ✅ CRITICAL FIX: Refresh the list from DB to get the new IDs
            const currentTitle = document.getElementById('vapi-campaign-title').innerText;
            const activeItem = document.querySelector('.vapi-list-item.active');
            await selectVapiCampaign(activeItem, currentTitle, activeCampaignId);

            const count = result.added;
            showToast(`Successfully imported ${count} candidates!`, "success");

            extractedCandidates = [];
            closePreview();
        } else {
            showToast("Failed to save to database.", "error");
        }
    } catch (e) {
        console.error(e);
        showToast("Network Error: Could not save.", "error");
    } finally {
        if (confirmBtn) {
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
    }
}

async function saveCandidatesToDB(campaignId) {
    const rows = document.querySelectorAll("#candidates-list-body tr");

    let list = [];
    rows.forEach(r => {
        list.push({
            name: r.children[0].innerText,
            phone: r.children[1].innerText,
            email: r.children[2].innerText
        });
    });

    await fetch("/api/candidates/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            campaign_id: campaignId,
            candidates: list
        })
    });

    showToast("Candidates saved to database!", "success");
}





/* =========================================
   SCRIPT BUILDER LOGIC (NEW)
   ========================================= */

// 1. Handle File Selection UI
function handleFileSelect(input) {
    const file = input.files[0];
    const ui = document.getElementById('file-ui-content');
    const zone = document.querySelector('.file-drop-zone');

    if (file) {
        // Change UI to show success
        zone.classList.add('uploaded');
        ui.innerHTML = `
            <i class="fa-solid fa-file-pdf"></i>
            <span style="color:white;">${file.name}</span>
            <small>Ready to analyze</small>
        `;
    }
}

// 2. Toggle Manual Input Box
function toggleManualAdd() {
    const box = document.getElementById('manual-add-box');
    if (box.style.display === 'none') {
        box.style.display = 'flex';
        document.getElementById('manual-q-input').focus();
    } else {
        box.style.display = 'none';
    }
}

// 3. Append Manual Question to Main Editor
function appendManualQuestion() {
    const input = document.getElementById('manual-q-input');
    const textarea = document.getElementById('generated-script');
    const question = input.value.trim();

    if (!question) return;

    // Append with a newline
    const currentText = textarea.value;
    const prefix = currentText.length > 0 ? "\n" : "";
    textarea.value = currentText + prefix + "- " + question;

    // Reset input
    input.value = '';
    showToast("Question added to script", "success");
}

// 4. GENERATE AI (Updated to send Job Role)
async function generateScriptAI() {
    const role = document.getElementById('job-role').value;
    const desc = document.getElementById('job-desc').value;
    const fileInput = document.getElementById('context-file');

    if (!role && !desc && fileInput.files.length === 0) {
        showToast('Please enter a Job Role or Description', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('job_role', role); // Sent to Backend
    formData.append('context_text', desc);
    if (fileInput.files.length > 0) {
        formData.append('file', fileInput.files[0]);
    }

    showToast('AI is generating questions...', 'info');

    // Simulating loading state in textarea
    const textarea = document.getElementById('generated-script');
    textarea.value = "🤖 Analyzing Job Role...\nReading Context...\nGenerating Interview Questions...";

    try {
        const response = await fetch('/api/generate-questions', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        // Update Textarea
        textarea.value = data.questions;
        showToast('Script generated successfully!', 'success');

    } catch (e) {
        showToast('Generation failed', 'error');
        textarea.value = ""; // Clear loading text
    }
}
/* --- MODERN SCRIPT BUILDER LOGIC --- */

let sbUploadedFiles = [];

// 1. Handle File Upload (Visual Tags)
function handleSbFileUpload(input) {
    if (input.files && input.files.length > 0) {
        // Add new files to array
        Array.from(input.files).forEach(file => {
            sbUploadedFiles.push(file);
        });
        renderSbFiles();
    }
}

function renderSbFiles() {
    const container = document.getElementById('sb-file-list');
    container.innerHTML = ''; // Clear current

    sbUploadedFiles.forEach((file, index) => {
        const tag = document.createElement('div');
        tag.className = 'sb-file-tag';
        tag.innerHTML = `
            <i class="fa-solid fa-file-lines" style="color:var(--primary-500);"></i>
            <span>${file.name}</span>
            <i class="fa-solid fa-xmark" style="cursor:pointer; margin-left:4px;" onclick="removeSbFile(${index})"></i>
        `;
        container.appendChild(tag);
    });
}

function removeSbFile(index) {
    sbUploadedFiles.splice(index, 1);
    renderSbFiles();
}

/* --- ADVANCED SCRIPT MODAL LOGIC --- */


async function sbSaveScript() {
    // 1. Validation: Ensure we have a generated blueprint
    if (!currentGeneratedBlueprint) {
        showToast("No blueprint to save. Generate one first!", "error");
        return;
    }

    // 2. Validation: Ensure a campaign is selected
    if (!activeCampaignId) {
        showToast("No active campaign selected. Please create one first.", "error");
        return;
    }

    const saveBtn = document.querySelector('.pm-footer .btn-primary');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    try {
        const finalPackage = {
            blueprint: currentGeneratedBlueprint,
            config: {
                saved_at: new Date().toISOString(),
                engine: "Groq-Llama3",
                status: "Script Confirmed" // Updated status
            }
        };

        // 3. Send to Backend with REAL ID
        const response = await fetch(`/api/campaigns/${activeCampaignId}/save-final`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalPackage)
        });

        if (response.ok) {
            // A. Close the Modal
            sbCloseModal();

            // B. Show Global Toast
            showToast("AI Agent Configured & Script Saved!", "success");

            // C. Show the "Down Side" Success Box (in the script tab)
            const successBox = document.getElementById('sb-saved-script');
            if (successBox) {
                successBox.style.display = 'block';
                successBox.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class="fa-solid fa-robot" style="font-size:20px;"></i>
                        <div>
                            <strong>AI Agent Confirmed</strong><br>
                            <span style="font-size:12px; opacity:0.8;">Blueprint stored in database. Ready for next steps.</span>
                        </div>
                    </div>
                `;
            }

        } else {
            const errData = await response.json();
            throw new Error(errData.detail || "Database save failed");
        }

    } catch (e) {
        console.error(e);
        showToast(`Error: ${e.message}`, "error");
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// ... existing functions ...}

// Ensure close function removes the class
function sbCloseModal() {
    document.getElementById('premiumScriptModal').classList.remove('active');
}

// 3. Close Modal
function sbCloseModal() {
    const modal = document.getElementById('premiumScriptModal');
    modal.classList.remove('active');
}




async function sbOpenModal() {
    const generateBtn = document.querySelector('.sb-pro-btn');
    const originalBtnText = generateBtn.innerHTML;

    // --- A. Gather Data from Previous Tabs ---

    // 1. Interview Mode & Duration
    // We look for the "selected" card in the Mode and Time sections
    const modeCard = document.querySelector('#mode-selection .step-card-compact.selected');
    const timeCard = document.querySelector('#time-selection .step-card-horizontal.selected');

    const interviewMode = modeCard ? modeCard.querySelector('.step-title').innerText : "Technical";
    const duration = timeCard ? timeCard.querySelector('.step-title').innerText : "15 Mins";

    // 2. Tech Stack & Domain (From Step 2)
    // We grab the dropdown value and any selected tech chips
    const selectedDomain = document.getElementById('selected-domain') ? document.getElementById('selected-domain').value : "General";

    let selectedSkills = [];
    document.querySelectorAll('.tech-option-box.selected span').forEach(el => {
        selectedSkills.push(el.innerText);
    });

    // 3. HR Focus Areas (From Step 2)
    let hrFocusAreas = [];
    document.querySelectorAll('.hr-card.selected strong').forEach(el => {
        hrFocusAreas.push(el.innerText);
    });

    // 4. Job Details (From the Text Inputs in Script Tab)
    const company = document.getElementById('sb-company').value || "Company";
    const role = document.getElementById('sb-job-role').value || "Candidate";
    const description = document.getElementById('sb-description').value || "";

    // --- B. Validation ---
    // Check if an AI Agent has been selected in the config
    if (!currentConfig.agentId) {
        showToast("Please select an AI Agent first.", "error");
        return;
    }

    // --- C. Construct Payload for Backend ---
    const payload = {
        // Agent Config (From Global Variable)
        agent_name: currentConfig.agentName,
        agent_id: currentConfig.agentId,
        voice_id: currentConfig.voiceId,
        language: currentConfig.language,
        strictness: currentConfig.strictness,

        // Interview Context (Gathered above)
        interview_mode: interviewMode,
        duration: duration,
        job_role: role,
        company_name: company,
        job_description: description,
        domain: selectedDomain,
        tech_stack: selectedSkills.join(", "),
        hr_focus: hrFocusAreas.join(", ")
    };

    console.log("Sending Payload to AI:", payload);

    // --- D. Call API ---
    // 1. Show Loading State
    generateBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Architecting Agent...';
    generateBtn.disabled = true;

    try {
        const response = await fetch('/api/generate-blueprint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("AI Generation Failed");

        const blueprint = await response.json();

        // 2. CRITICAL: Save Blueprint to Global Variable
        // This ensures the "Confirm & Launch" button can see the generated prompt
        window.currentGeneratedBlueprint = blueprint;
        console.log("Blueprint Saved Globally:", window.currentGeneratedBlueprint);

        // 3. Render Data to Modal
        // We use the safe render function we fixed earlier
        if (typeof renderBlueprintToModal === 'function') {
            await renderBlueprintToModal(blueprint, payload);
        } else {
            console.warn("renderBlueprintToModal function is missing!");
        }

        // 4. Show the Modal
        document.getElementById('premiumScriptModal').classList.add('active');

    } catch (error) {
        console.error("Blueprint Error:", error);
        showToast("Failed to generate blueprint. Check console.", "error");
    } finally {
        // 5. Reset Button State
        generateBtn.innerHTML = originalBtnText;
        generateBtn.disabled = false;
    }
}
async function renderBlueprintToModal(blueprint, context) {
    console.log("Rendering Blueprint:", blueprint);

    // 1. Fetch real candidate count from database
    let candidateCount = 0;
    let estimatedHours = 0;

    if (activeCampaignId) {
        try {
            const response = await fetch(`/api/campaigns/${activeCampaignId}/candidates`);
            const data = await response.json();
            candidateCount = data.candidates ? data.candidates.length : 0;

            // Calculate estimated campaign time (15 minutes per candidate)
            const minutesPerCandidate = 15;
            const totalMinutes = candidateCount * minutesPerCandidate;
            estimatedHours = (totalMinutes / 60).toFixed(1);
        } catch (error) {
            console.error("Error fetching candidate count:", error);
        }
    }

    // 2. Update Metrics with real data
    if (document.getElementById('bp-candidate-count')) {
        document.getElementById('bp-candidate-count').innerText = candidateCount;
    }

    if (document.getElementById('bp-campaign-time')) {
        document.getElementById('bp-campaign-time').innerText = estimatedHours;
    }

    if (document.getElementById('bp-persona-name')) {
        document.getElementById('bp-persona-name').innerText = context.agent_name || "AI Recruiter";
    }

    if (document.getElementById('bp-interview-mode')) {
        document.getElementById('bp-interview-mode').innerText = context.interview_mode || "General";
    }

    // 2. Update System Prompt (The Logic Box)
    const logicBox = document.querySelector('.system-logic-box');
    if (logicBox) {
        // We format the prompt nicely
        logicBox.innerHTML = `
            <div style="font-family:monospace; font-size:12px; color:#a1a1aa; white-space:pre-wrap;">
                ${blueprint.system_prompt || "No prompt generated."}
            </div>
        `;
    }

    // 3. THE FIX: Safely Handle the "Interview Flow" Section
    const scriptContainer = document.getElementById('blueprint-script-container');

    // We check: Does this container exist? 
    // If you deleted it from HTML, this is NULL, so the code inside SKIPs automatically.
    if (scriptContainer) {
        let html = '';
        if (blueprint.phases) {
            blueprint.phases.forEach((phase, index) => {
                html += `
                <div class="script-phase">
                    <div class="phase-badge">Step ${index + 1}</div>
                    <strong>${phase.name || 'Phase'}</strong>
                    <p>${phase.description || ''}</p>
                </div>`;
            });
        }
        scriptContainer.innerHTML = html;
    }
    // No 'else' needed. If it's missing, we just do nothing (No Error!)
}


/* --- REALISTIC REPORTS LOGIC --- */

// Hook into the tab switch function to trigger report loading
const originalSwitchHrTab = window.switchHrTab;
window.switchHrTab = function (tabId, tabElement) {
    originalSwitchHrTab(tabId, tabElement); // Call original

    // If clicking Reports tab, render data
    if (tabId === 'tab-reports') {
        renderRealisticReports();
    }
};

/* --- UPDATED REPORT RENDERING LOGIC --- */

// 1. Updated Table Renderer
async function renderRealisticReports() {
    const tbody = document.querySelector('#tab-reports .sd-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-tertiary);"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading Analytics...</td></tr>';

    if (!activeCampaignId) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-tertiary);">Please select a campaign to view reports.</td></tr>';
        return;
    }

    try {
        // Fetch candidates
        const res = await fetch(`/api/campaigns/${activeCampaignId}/candidates`);
        const data = await res.json();
        tbody.innerHTML = '';

        if (!data.candidates || data.candidates.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-tertiary);">No interview data available yet.</td></tr>';
            return;
        }

        // Render Rows with Eye Button
        data.candidates.forEach(c => {
            // Mock Status Logic if empty
            const status = c.status || "Pending";
            let badgeClass = "badge-neutral";

            if (status === "Selected") badgeClass = "badge-success";
            else if (status === "Rejected") badgeClass = "badge-danger";
            else badgeClass = "badge-warning";

            // Mock Score visual if empty
            const mockScore = c.score || Math.floor(Math.random() * (95 - 70 + 1)) + 70;
            const scoreColor = mockScore > 80 ? "#10b981" : "#fb923c";

            const date = c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <strong style="color:white; font-size:13px;">${c.name}</strong><br>
                    <span style="font-size:11px; color:var(--text-tertiary);">${c.email || '-'}</span>
                </td>
                <td><span class="badge ${badgeClass}">${status}</span></td>
                <td><span style="color:${scoreColor}; font-weight:700;">${mockScore}/100</span></td>
                <td style="color:var(--text-tertiary); font-size:12px;">${date}</td>
                <td style="text-align: center;">
                    <button class="icon-btn btn-sm" onclick="openCandidateReport('${c.id}')" title="View Detailed Report" style="border: 1px solid var(--primary-500); color: var(--primary-500); background: rgba(249, 115, 22, 0.1);">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

    } catch (e) {
        console.error("Reports Error:", e);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#ef4444;">Failed to load data.</td></tr>';
    }
}

/* --- NEW REPORT MODAL LOGIC --- */

async function openCandidateReport(candidateId) {
    const modal = document.getElementById('reportModal');

    // 1. Show Modal & Loading State
    modal.classList.add('active');
    document.getElementById('report-name').innerText = "Loading...";
    document.getElementById('report-transcript-box').innerHTML = '<div style="padding:20px; text-align:center; color:gray;"><i class="fa-solid fa-circle-notch fa-spin"></i> Fetching Interview Data...</div>';

    try {
        // 2. Fetch Detailed Report from Backend
        const response = await fetch(`/api/candidates/${candidateId}/report`);
        const data = await response.json();

        if (data.error) throw new Error(data.detail);

        const c = data.candidate;
        const stats = data.interview_data;

        // 3. Populate Header
        document.getElementById('report-name').innerText = c.name;
        document.getElementById('report-email').innerText = c.email || "No Email";

        // Initials Avatar
        const initials = c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        document.getElementById('report-avatar').innerText = initials;

        // 4. Populate Scores
        document.getElementById('report-total-score').innerText = stats.overall_score;

        // Helper to set bars
        const setBar = (id, val) => {
            document.getElementById(`bar-${id}`).style.width = `${val}%`;
            document.getElementById(`val-${id}`).innerText = `${val}%`;
        };

        setBar('confidence', stats.scores.confidence);
        setBar('communication', stats.scores.communication);
        setBar('technical', stats.scores.technical);
        setBar('cultural', stats.scores.cultural);

        // 5. Populate Transcript
        const tBox = document.getElementById('report-transcript-box');
        tBox.innerHTML = ''; // Clear loading

        stats.transcript.forEach(msg => {
            const isAi = msg.role === 'ai';
            const bubble = document.createElement('div');
            bubble.className = `chat-bubble ${isAi ? 'ai' : 'user'}`;

            // Icon
            const icon = isAi ? '<i class="fa-solid fa-robot"></i>' : '<i class="fa-solid fa-user"></i>';
            const color = isAi ? 'var(--primary-500)' : 'var(--text-tertiary)';

            bubble.innerHTML = `
                <div style="color:${color}; font-size:16px; margin-top:6px;">${icon}</div>
                <div>
                    <div class="bubble-content">${msg.text}</div>
                    <span class="chat-time">${msg.time}</span>
                </div>
            `;
            tBox.appendChild(bubble);
        });

    } catch (e) {
        console.error(e);
        showToast("Failed to load report", "error");
        closeReportModal();
    }
}

function closeReportModal() {
    document.getElementById('reportModal').classList.remove('active');
}

// Ensure global scope
window.openCandidateReport = openCandidateReport;
window.closeReportModal = closeReportModal;

/* --- HELPER: Add Row to Source Data UI --- */
function addCandidateRowToUI(name, phone, email, id = null) {
    const tbody = document.getElementById('candidates-list-body');

    // Clear "Empty State" row if it exists
    const emptyState = tbody.querySelector('.empty-state-row');
    if (emptyState) {
        tbody.innerHTML = '';
    }

    const row = document.createElement('tr');

    // Store the Database ID in the row (useful for debugging/access)
    if (id) row.dataset.id = id;

    // Determine Delete Action:
    // If ID exists -> Call API. If no ID (temp) -> Just remove from UI.
    const deleteAction = id
        ? `deleteCandidateAPI('${id}', this)`
        : `this.closest('tr').remove(); updateCandidateCount();`;

    row.innerHTML = `
        <td style="font-weight:600; color:white;">${name}</td>
        <td style="color:var(--text-tertiary); font-family:'Space Grotesk', monospace;">${phone || '--'}</td>
        <td style="color:var(--text-tertiary);">${email || '--'}</td>
        <td style="text-align:right;">
            <button class="btn-text-only" onclick="${deleteAction}" style="color: #ef4444; margin-left:auto;">
                <i class="fa-solid fa-trash"></i>
            </button>
        </td>
    `;

    tbody.appendChild(row);
    updateCandidateCount();
}
// Ensure the count update logic is correct
function updateCandidateCount() {
    const tbody = document.getElementById('candidates-list-body');
    // Count rows that are NOT the empty state
    const rows = tbody.querySelectorAll('tr:not(:has(.empty-state-row))');
    const countSpan = document.getElementById('candidate-count');
    if (countSpan) countSpan.innerText = rows.length;
}

function updateCandidateCount() {
    const count = document.querySelectorAll('#candidates-list-body tr').length;
    document.getElementById('candidate-count').innerText = count;
}


// --- DELETE CAMPAIGN LOGIC ---
async function deleteCampaign(event, campaignId, type) {
    // 1. Prevent clicking the parent div (which would select the campaign)
    event.stopPropagation();

    // 2. Confirm Dialog
    if (!confirm("Are you sure you want to delete this campaign? This cannot be undone.")) {
        return;
    }

    try {
        // 3. Call Backend
        const response = await fetch(`/api/campaigns/${campaignId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast("Campaign deleted successfully", "success");

            // 4. Reload List
            // If the deleted campaign was active, this refresh handles clearing the view
            await loadUserCampaigns(type);

            // If we deleted the active one, clear the ID
            if (activeCampaignId === campaignId) {
                activeCampaignId = null;
            }
        } else {
            showToast("Failed to delete campaign", "error");
        }
    } catch (e) {
        console.error(e);
        showToast("Error deleting campaign", "error");
    }
}


async function loadDashboardRealData() {
    try {
        const res = await fetch('/api/dashboard-stats');
        const data = await res.json();

        if (data.error) return;

        // Update KPI Cards
        const totalEl = document.getElementById('dash-total-candidates');
        const activeEl = document.getElementById('dash-active-count');
        const doneEl = document.getElementById('dash-interviews-done');

        if (totalEl) totalEl.innerText = data.total_candidates;
        if (activeEl) activeEl.innerText = data.active_candidates;
        if (doneEl) doneEl.innerText = data.interviews_done;
    } catch (e) { console.error(e); }
}


// --- LIVE ACTIVITY TABLE ---
async function loadLiveActivityTable() {
    const tbody = document.getElementById('dashboard-live-body');
    if (!tbody) return;

    try {
        const res = await fetch('/api/dashboard/live-activity');
        const data = await res.json();

        if (!data.activity || data.activity.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:gray;">No live activity.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.activity.forEach(c => {
            // Logic for badge colors
            let badgeClass = 'badge-neutral';
            if (c.display_status.includes('Active')) badgeClass = 'badge-primary';
            if (c.display_status.includes('Analyzed')) badgeClass = 'badge-success';
            if (c.display_status.includes('Dialing')) badgeClass = 'badge-warning';

            // Initials generator
            const initials = c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            const row = `
                <tr>
                    <td>
                        <div class="flex-center" style="justify-content: flex-start; gap: 12px;">
                            <div class="avatar" style="width: 28px; height: 28px; font-size: 10px;">${initials}</div>
                            <span style="font-weight: 500;">${c.name}</span>
                        </div>
                    </td>
                    <td>Candidate</td>
                    <td><span class="badge ${badgeClass}">${c.display_status}</span></td>
                    <td class="font-mono text-muted">${c.duration}</td>
                    <td class="text-muted">Just now</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (e) { console.error(e); }
}

// --- ALL CANDIDATES TABLE ---
async function loadAllCandidatesTable() {
    const tbody = document.getElementById('all-candidates-tbody'); // Fixed ID to match HTML
    if (!tbody) return;

    try {
        const res = await fetch('/api/candidates/all');
        const data = await res.json();

        if (!data.candidates || data.candidates.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-tertiary);">No candidates found yet. Create a campaign and add candidates!</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.candidates.forEach(c => {
            // Determine badge color based on status
            let badgeClass = 'badge-neutral';
            if (c.status === 'Active' || c.status === 'In Progress') badgeClass = 'badge-primary';
            if (c.status === 'Selected') badgeClass = 'badge-success';
            if (c.status === 'Rejected') badgeClass = 'badge-danger';
            if (c.status === 'Queued' || c.status === 'Scheduled') badgeClass = 'badge-warning';

            const row = `
                <tr>
                    <td><strong>${c.name}</strong></td>
                    <td class="font-mono text-muted">${c.phone || '--'}</td>
                    <td style="color:var(--text-secondary);">${c.campaign_name || 'Unknown'}</td>
                    <td><span class="badge ${badgeClass}">${c.status}</span></td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button class="icon-btn" style="width: 32px; height: 32px;" title="Call Candidate">
                                <i class="fa-solid fa-phone"></i>
                            </button>
                            <button class="icon-btn" style="width: 32px; height: 32px;" onclick="deleteCandidateAPI('${c.id}', this)" title="Delete Candidate">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            tbody.innerHTML += row;
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#ef4444;">Error loading candidates.</td></tr>';
    }
}

// --- LAUNCH SIMULATION ---
async function launchCurrentCampaign() {
    // Check if a campaign is actually selected
    if (!activeCampaignId) {
        showToast("No campaign selected to launch", "error");
        return;
    }

    // 1. Visual Feedback on Button
    const btn = document.querySelector('.btn-vapi-launch');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Launching...';

    // 2. Simulate delay
    setTimeout(() => {
        showToast("🚀 Campaign Launched! Calls initiated...", "success");
        btn.innerHTML = originalContent;

        // 3. Switch View to Dashboard to see "Action"
        const dashboardLink = document.querySelector('.nav-link[onclick*="dashboard"]');
        if (dashboardLink) dashboardLink.click();

        // 4. Refresh Data to show new "Active" statuses
        setTimeout(() => {
            loadDashboardRealData();
            loadLiveActivityTable();
            loadAllCandidatesTable();
        }, 800);

    }, 1500);
}




/* --- NEW AI PERSONA TAB FUNCTIONS --- */

let currentAudio = null;
let currentPlayButtonIcon = null;

// 1. Handle Voice Audio Preview
function handleVoicePlay(event, buttonElement, audioUrl) {
    // Stop propagation so we don't select the card itself when clicking play
    event.stopPropagation();

    const icon = buttonElement.querySelector('i');
    const avatarContainer = buttonElement.closest('.voice-avatar-container');

    // If current audio is playing, pause it and reset its icon
    if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        if (currentPlayButtonIcon) {
            currentPlayButtonIcon.classList.replace('fa-stop', 'fa-play');
            currentPlayButtonIcon.closest('.voice-avatar-container').classList.remove('playing');
        }
        // If we clicked the same button that was playing, just stop and return
        if (currentPlayButtonIcon === icon) {
            currentAudio = null;
            currentPlayButtonIcon = null;
            return;
        }
    }

    // Play new audio
    // Note: Since we don't have real URLs, I'm using a short placeholder sound.
    // Replace 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' with actual voice samples later.
    currentAudio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    currentAudio.volume = 0.5;

    currentAudio.play().then(() => {
        icon.classList.replace('fa-play', 'fa-stop');
        avatarContainer.classList.add('playing');
        currentPlayButtonIcon = icon;
    }).catch(e => showToast("Could not play audio preview", "error"));

    // Reset icon when audio finishes
    currentAudio.onended = () => {
        icon.classList.replace('fa-stop', 'fa-play');
        avatarContainer.classList.remove('playing');
        currentAudio = null;
        currentPlayButtonIcon = null;
    };
}


// 2. Handle "See More Voices" Toggle
function toggleSeeMoreVoices(button) {
    const hiddenRows = document.querySelectorAll('.hidden-voice-row');
    const isExpanded = button.getAttribute('data-expanded') === 'true';
    const icon = button.querySelector('i');
    const text = button.querySelector('span');

    if (isExpanded) {
        // Collapse
        hiddenRows.forEach(row => row.style.display = 'none');
        button.setAttribute('data-expanded', 'false');
        icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
        text.textContent = 'See More Voices';
    } else {
        // Expand
        hiddenRows.forEach(row => row.style.display = 'flex'); // Use flex because the parents are flex containers
        button.setAttribute('data-expanded', 'true');
        icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
        text.textContent = 'Show Less';
    }
}


// 3. Updated Selection function for the new card style
// We need a slightly different selection function because the class names changed to .voice-card-eleven
function selectVoiceCard(element) {
    // 1. Find container
    const container = document.getElementById('voice-selection-grid');
    // 2. Remove selected from all
    container.querySelectorAll('.voice-card-eleven').forEach(card => card.classList.remove('selected'));
    // 3. Add selected to clicked
    element.classList.add('selected');
}


/* =========================================
   2. SELECTION HANDLERS (UI + LOGIC)
   ========================================= */

// A. Handle AGENT Selection (The big cards: Aanya, Rohan, Kavya)
function selectAgentVapi(element) {
    // 1. Remove 'selected' class from ALL agent cards
    document.querySelectorAll('#agent-selection .agent-card-modern').forEach(card => {
        card.classList.remove('selected');
    });

    // 2. Add 'selected' class to the CLICKED card
    element.classList.add('selected');

    // 3. Save the selection to our config
    const agentKey = element.getAttribute('data-assistant-key');
    if (VAPI_CONFIG.agents[agentKey]) {
        currentConfig.agentId = VAPI_CONFIG.agents[agentKey].id;
        currentConfig.agentName = VAPI_CONFIG.agents[agentKey].name;
        console.log(`Agent Selected: ${currentConfig.agentName}`);
    }
}

// B. Handle VOICE Selection (The list: Raju, Priya, etc.)
function selectVoiceVapi(element) {
    // 1. Remove 'selected' class from ALL voice cards
    document.querySelectorAll('#voice-selection-grid .voice-card-el').forEach(card => {
        card.classList.remove('selected');
    });

    // 2. Add 'selected' class to the CLICKED card
    element.classList.add('selected');

    // 3. Save the selection
    const voiceId = element.getAttribute('data-voice-id');
    // If we have a mapped ID in VAPI_CONFIG, use it; otherwise use the raw ID
    const realVoiceId = VAPI_CONFIG.voices[voiceId] || voiceId;

    currentConfig.voiceId = realVoiceId;
    console.log(`Voice Selected: ${realVoiceId}`);
}

// 3. Play Audio Preview (Mock)
function playVoicePreview(event, button) {
    event.stopPropagation(); // Don't select the card

    const icon = button.querySelector('i');

    // Simple toggle logic
    if (icon.classList.contains('fa-play')) {
        // Reset all other icons first
        document.querySelectorAll('.el-play-overlay i').forEach(i => i.classList.replace('fa-stop', 'fa-play'));

        icon.classList.replace('fa-play', 'fa-stop');
        // Mock finish after 2 seconds
        setTimeout(() => {
            icon.classList.replace('fa-stop', 'fa-play');
        }, 2000);
    } else {
        icon.classList.replace('fa-stop', 'fa-play');
    }
}

// 4. Toggle "See More"
function toggleSeeMoreVoices(btn) {
    const hidden = document.querySelectorAll('.hidden-voice-row');
    const isExpanded = btn.getAttribute('data-expanded') === 'true';

    hidden.forEach(row => row.style.display = isExpanded ? 'none' : 'flex');

    btn.setAttribute('data-expanded', !isExpanded);
    btn.querySelector('span').innerText = isExpanded ? 'See More Voices' : 'Show Less';
    btn.querySelector('i').classList.toggle('fa-chevron-down');
    btn.querySelector('i').classList.toggle('fa-chevron-up');
}


function selectLanguage(element) {
    document.querySelectorAll('#lang-selection .lang-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');

    currentConfig.language = element.querySelector('.lang-name').innerText;
    console.log(`Updated Config: Language is now ${currentConfig.language}`);
}

function selectStrictness(element) {
    document.querySelectorAll('#strict-selection .round-option-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');

    currentConfig.strictness = element.querySelector('.card-title').innerText;
    console.log(`Updated Config: Strictness is now ${currentConfig.strictness}`);
}

function selectOption(element, containerId) {
    // 1. Find the container (mode-selection or time-selection)
    const container = document.getElementById(containerId);

    // 2. Remove 'selected' from ALL cards inside this container
    const siblings = container.querySelectorAll('.step-card-compact, .step-card-horizontal, .round-option-card');
    siblings.forEach(card => card.classList.remove('selected'));

    // 3. Add 'selected' to the clicked card
    element.classList.add('selected');

    // --- NEW LOGIC: SHOW/HIDE TECH CONFIG ---
    if (containerId === 'mode-selection') {
        const titleElement = element.querySelector('.step-title, .card-title');
        const titleText = titleElement ? titleElement.innerText : '';
        const techSection = document.getElementById('tech-sub-options');

        // Show if Technical or Mixed
        if (titleText.includes('Technical') || titleText.includes('Mixed')) {
            techSection.style.display = 'block';
        } else {
            techSection.style.display = 'none';
        }
    }
}

async function deleteCandidateAPI(id, btnElement) {
    if (!confirm("Delete this candidate permanently?")) return;

    // Visual feedback
    const originalContent = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    btnElement.disabled = true;

    try {
        const res = await fetch(`/api/candidates/${id}`, { method: 'DELETE' });
        if (res.ok) {
            // Remove row from UI
            const row = btnElement.closest('tr');
            row.style.opacity = '0';
            setTimeout(() => {
                row.remove();
                updateCandidateCount();
            }, 300);
            showToast("Candidate deleted", "success");
        } else {
            showToast("Failed to delete", "error");
            btnElement.innerHTML = originalContent;
            btnElement.disabled = false;
        }
    } catch (e) {
        console.error(e);
        showToast("Network Error", "error");
        btnElement.innerHTML = originalContent;
        btnElement.disabled = false;
    }
}


// --- NEW TECHNICAL DRILL-DOWN LOGIC ---

// 1. Handle Domain Selection
function selectDomain(element, value) {
    // Remove active class from siblings
    const parent = element.parentElement;
    parent.querySelectorAll('.domain-card').forEach(el => el.classList.remove('active'));

    // Activate clicked
    element.classList.add('active');
    document.getElementById('selected-domain').value = value;

    // Optional: Pre-fill some tags based on selection
    suggestTags(value);
}

// 2. Suggest Tags based on Domain (Optional Helper)
function suggestTags(domain) {
    const container = document.getElementById('tech-tags-container');
    container.innerHTML = ''; // Clear existing

    let suggestions = [];
    if (domain === 'Frontend') suggestions = ['React', 'JavaScript', 'CSS', 'HTML'];
    if (domain === 'Backend') suggestions = ['Python', 'Node.js', 'SQL', 'API Design'];
    if (domain === 'Full Stack') suggestions = ['React', 'Node.js', 'MongoDB', 'AWS'];
    if (domain === 'Mobile') suggestions = ['Flutter', 'Dart', 'iOS', 'Android'];
    if (domain === 'Data') suggestions = ['Python', 'Pandas', 'SQL', 'Machine Learning'];
    if (domain === 'DevOps') suggestions = ['Docker', 'Kubernetes', 'AWS', 'CI/CD'];

    suggestions.forEach(tag => {
        addTagHTML(tag);
    });
}

// 3. Add Custom Tag (Input)
function addCustomTag() {
    const input = document.getElementById('tech-stack-input');
    const val = input.value.trim();
    if (val) {
        addTagHTML(val);
        input.value = '';
    }
}

// 3b. Helper to create HTML
function addTagHTML(text) {
    const container = document.getElementById('tech-tags-container');
    const tag = document.createElement('span');
    tag.className = 'tech-tag';
    tag.innerHTML = `${text} <i class="fa-solid fa-xmark"></i>`;
    tag.onclick = function () { this.remove(); };
    container.appendChild(tag);
}

// 4. Handle Enter Key in Input
document.addEventListener('DOMContentLoaded', () => {
    const techInput = document.getElementById('tech-stack-input');
    if (techInput) {
        techInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addCustomTag();
        });
    }
});
// --- COMPREHENSIVE SKILLS DATABASE (12 ROLES) ---
const techSkillsDB = {
    'Frontend': [
        { name: 'React.js', icon: 'fa-brands fa-react', color: '#61DAFB' },
        { name: 'Next.js', icon: 'fa-solid fa-n', color: '#ffffff' },
        { name: 'Vue.js', icon: 'fa-brands fa-vuejs', color: '#4FC08D' },
        { name: 'TypeScript', icon: 'fa-solid fa-code', color: '#3178C6' },
        { name: 'Tailwind CSS', icon: 'fa-solid fa-wind', color: '#38B2AC' },
        { name: 'HTML5/CSS3', icon: 'fa-brands fa-html5', color: '#E34F26' },
        { name: 'Redux', icon: 'fa-solid fa-diagram-project', color: '#764ABC' }
    ],
    'Backend': [
        { name: 'Node.js', icon: 'fa-brands fa-node', color: '#339933' },
        { name: 'Python', icon: 'fa-brands fa-python', color: '#3776AB' },
        { name: 'Java', icon: 'fa-brands fa-java', color: '#007396' },
        { name: 'GoLang', icon: 'fa-brands fa-golang', color: '#00ADD8' },
        { name: 'PostgreSQL', icon: 'fa-solid fa-database', color: '#336791' },
        { name: 'MongoDB', icon: 'fa-solid fa-leaf', color: '#47A248' },
        { name: 'Docker', icon: 'fa-brands fa-docker', color: '#2496ED' }
    ],
    'FullStack': [
        { name: 'MERN Stack', icon: 'fa-solid fa-layer-group', color: '#00D8FF' },
        { name: 'Next.js Full', icon: 'fa-solid fa-n', color: '#ffffff' },
        { name: 'Django+React', icon: 'fa-brands fa-python', color: '#092E20' },
        { name: 'Spring+Angular', icon: 'fa-brands fa-java', color: '#6DB33F' },
        { name: 'Supabase', icon: 'fa-solid fa-bolt', color: '#3ECF8E' }
    ],
    'Mobile': [
        { name: 'Flutter', icon: 'fa-solid fa-mobile', color: '#02569B' },
        { name: 'React Native', icon: 'fa-brands fa-react', color: '#61DAFB' },
        { name: 'Swift (iOS)', icon: 'fa-brands fa-apple', color: '#F05138' },
        { name: 'Kotlin (Android)', icon: 'fa-brands fa-android', color: '#3DDB85' }
    ],
    'GenerativeAI': [
        { name: 'LangChain', icon: 'fa-solid fa-link', color: '#1C3C3C' },
        { name: 'OpenAI API', icon: 'fa-solid fa-robot', color: '#10A37F' },
        { name: 'HuggingFace', icon: 'fa-solid fa-face-smile', color: '#FFD21E' },
        { name: 'Vector DBs', icon: 'fa-solid fa-database', color: '#E10098' },
        { name: 'RAG Pipelines', icon: 'fa-solid fa-diagram-project', color: '#8b5cf6' }
    ],
    'AIMLEngineer': [
        { name: 'PyTorch', icon: 'fa-solid fa-fire', color: '#EE4C2C' },
        { name: 'TensorFlow', icon: 'fa-solid fa-brain', color: '#FF6F00' },
        { name: 'Scikit-learn', icon: 'fa-solid fa-calculator', color: '#F7931E' },
        { name: 'Computer Vision', icon: 'fa-solid fa-eye', color: '#3b82f6' },
        { name: 'NLP', icon: 'fa-solid fa-comments', color: '#10b981' }
    ],
    'DataEngineer': [
        { name: 'Apache Spark', icon: 'fa-solid fa-bolt', color: '#E25A1C' },
        { name: 'Kafka', icon: 'fa-solid fa-envelope', color: '#231F20' },
        { name: 'Snowflake', icon: 'fa-solid fa-snowflake', color: '#29B5E8' },
        { name: 'SQL (Adv)', icon: 'fa-solid fa-database', color: '#F29111' },
        { name: 'AWS Glue', icon: 'fa-brands fa-aws', color: '#FF9900' }
    ],
    'DataAnalyst': [
        { name: 'SQL', icon: 'fa-solid fa-database', color: '#F29111' },
        { name: 'Tableau', icon: 'fa-solid fa-chart-simple', color: '#E97627' },
        { name: 'PowerBI', icon: 'fa-solid fa-chart-column', color: '#F2C811' },
        { name: 'Excel', icon: 'fa-solid fa-table', color: '#217346' },
        { name: 'Python (Pandas)', icon: 'fa-brands fa-python', color: '#150458' }
    ],
    'DevOps': [
        { name: 'AWS', icon: 'fa-brands fa-aws', color: '#FF9900' },
        { name: 'Docker', icon: 'fa-brands fa-docker', color: '#2496ED' },
        { name: 'Kubernetes', icon: 'fa-solid fa-dharmachakra', color: '#326CE5' },
        { name: 'Terraform', icon: 'fa-solid fa-code', color: '#7B42BC' },
        { name: 'Jenkins (CI/CD)', icon: 'fa-brands fa-jenkins', color: '#D24939' }
    ],
    'Product': [
        { name: 'Agile / Scrum', icon: 'fa-solid fa-rotate', color: '#0052CC' },
        { name: 'Jira', icon: 'fa-brands fa-jira', color: '#0052CC' },
        { name: 'Roadmapping', icon: 'fa-solid fa-map', color: '#FF5630' },
        { name: 'Data Analytics', icon: 'fa-solid fa-chart-bar', color: '#36B37E' }
    ],
    'UIUX': [
        { name: 'Figma', icon: 'fa-brands fa-figma', color: '#F24E1E' },
        { name: 'Adobe XD', icon: 'fa-solid fa-pen-nib', color: '#FF61F6' },
        { name: 'Prototyping', icon: 'fa-solid fa-object-group', color: '#A259FF' },
        { name: 'User Research', icon: 'fa-solid fa-users', color: '#10B981' }
    ],
    'QA': [
        { name: 'Selenium', icon: 'fa-solid fa-robot', color: '#43B02A' },
        { name: 'Cypress', icon: 'fa-solid fa-eye', color: '#17202C' },
        { name: 'Java / Python', icon: 'fa-solid fa-code', color: '#3776AB' },
        { name: 'API Testing', icon: 'fa-solid fa-paper-plane', color: '#FF6C37' }
    ]
};

// --- 2. UPDATED CLICK HANDLER WITH COLORS ---
function handleDomainClick(element, domainKey) {
    // UI Selection
    document.querySelectorAll('.domain-card-big').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    // Save Value
    document.getElementById('selected-domain').value = domainKey;
    document.getElementById('tech-stack-section').style.display = 'block';

    // Populate Tech Stack
    const container = document.getElementById('tech-options-container');
    container.innerHTML = '';
    const skills = techSkillsDB[domainKey] || [];

    skills.forEach(skill => {
        const box = document.createElement('div');
        box.className = 'tech-option-box';

        // --- KEY CHANGE: Inject CSS Variables for color ---
        // We set --skill-color locally so CSS can use it for borders/icons
        box.style.setProperty('--skill-color', skill.color);
        box.style.setProperty('--skill-shadow', `${skill.color}40`); // 40 = 25% opacity hex

        box.innerHTML = `<i class="${skill.icon}"></i> <span>${skill.name}</span>`;
        box.onclick = () => box.classList.toggle('selected');
        container.appendChild(box);
    });
}

function selectOption(element, containerId) {
    // 1. Find the container (mode-selection or time-selection)
    const container = document.getElementById(containerId);

    // 2. Remove 'selected' from ALL cards inside this container
    const siblings = container.querySelectorAll('.step-card-compact, .step-card-horizontal, .round-option-card');
    siblings.forEach(card => card.classList.remove('selected'));

    // 3. Add 'selected' to the clicked card
    element.classList.add('selected');

    // --- NEW LOGIC: SHOW/HIDE TECH CONFIG ---
    if (containerId === 'mode-selection') {
        const titleElement = element.querySelector('.step-title, .card-title');
        const titleText = titleElement ? titleElement.innerText : '';
        const techSection = document.getElementById('role-configuration-section'); // Fixed ID based on your HTML
        const techWrapper = document.getElementById('tech-domain-wrapper');
        const hrWrapper = document.getElementById('hr-focus-wrapper');

        // Always show the main container when a selection is made
        if (techSection) techSection.style.display = 'block';

        // Reset visibility of inner wrappers
        if (techWrapper) techWrapper.style.display = 'none';
        if (hrWrapper) hrWrapper.style.display = 'none';

        // Conditional Display
        if (titleText.includes('Technical')) {
            if (techWrapper) techWrapper.style.display = 'block';
        } else if (titleText.includes('HR Round')) {
            if (hrWrapper) hrWrapper.style.display = 'block';
        } else if (titleText.includes('Mixed')) {
            if (techWrapper) techWrapper.style.display = 'block';
            if (hrWrapper) hrWrapper.style.display = 'block';
        }
    }
}



function toggleHrFocus(element, type) {
    element.classList.toggle('selected');
}

// 4. UPDATED GATHER DATA FUNCTION
function getSelectedConfigData() {
    const modeCard = document.querySelector('#mode-selection .step-card-compact.selected');
    const modeName = modeCard ? modeCard.querySelector('.step-title').innerText : '';

    let data = { domain: '', skills: [], hrFocus: [] };

    // Get Tech Data if Tech or Mixed
    if (modeName.includes('Technical') || modeName.includes('Mixed')) {
        data.domain = document.getElementById('selected-domain').value;
        document.querySelectorAll('.tech-option-box.selected').forEach(box => {
            data.skills.push(box.querySelector('span').textContent.trim());
        });
    }

    // Get HR Data if HR or Mixed
    if (modeName.includes('HR') || modeName.includes('Mixed')) {
        document.querySelectorAll('.hr-card.selected').forEach(card => {
            data.hrFocus.push(card.querySelector('strong').textContent.trim());
        });
    }

    return data;
}





// ==========================================
// 4. LAUNCH CAMPAIGN (Sends IDs + Prompt to Backend)
// ==========================================
async function sbSaveScript() {
    const launchBtn = document.querySelector('.pm-footer .btn-primary');

    // 1. Validation - Check for campaign
    if (!activeCampaignId) {
        showToast("Error: No campaign selected. Please create or select a campaign first.", "error");
        return;
    }

    // 2. Validation - Check for blueprint
    if (!currentGeneratedBlueprint || !currentGeneratedBlueprint.system_prompt) {
        showToast("Error: No System Prompt found. Please generate it first.", "error");
        return;
    }

    // 3. Validation - Check for agent and voice
    if (!currentConfig.agentId || !currentConfig.voiceId) {
        showToast("Error: Agent or Voice ID missing.", "error");
        return;
    }

    // 4. Prepare the Final Payload
    // This contains EVERYTHING needed to update the campaign and start the Vapi Call
    const launchPayload = {
        campaign_id: activeCampaignId,  // ✅ Use existing campaign ID

        // --- THE CRITICAL VAPI CONFIG ---
        vapi_agent_id: currentConfig.agentId,   // The selected Assistant ID
        vapi_voice_id: currentConfig.voiceId,   // The selected Voice Model ID
        system_prompt: currentGeneratedBlueprint.system_prompt, // The detailed instruction

        // Metadata
        strictness: currentConfig.strictness,
        interview_mode: currentConfig.interviewMode
    };

    console.log("🚀 Launching Campaign with Payload:", launchPayload);

    // 5. Send to Backend
    launchBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Launching...';
    launchBtn.disabled = true;

    try {
        const response = await fetch('/api/launch-campaign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(launchPayload)
        });

        const result = await response.json();

        if (response.ok) {
            showToast(`✅ ${result.message}`, "success");
            sbCloseModal();

            // Update UI for Active campaign state
            updateHeaderButtons('Active');
            updateTabVisibility('Active');

            // Auto-navigate to Reports tab  
            const reportsTab = document.querySelector('[onclick*="tab-reports"]');
            if (reportsTab) {
                switchHrTab('tab-reports', reportsTab);
            }

            // Update campaign status in UI
            const statusElement = document.querySelector('.vapi-content-header p span');
            if (statusElement) {
                statusElement.style.color = 'var(--success)';
                statusElement.innerHTML = '● Active';
            }

            // Optionally reload campaign list to show updated status
            await loadUserCampaigns('audio');
        } else {
            throw new Error(result.detail || "Launch failed");
        }

    } catch (error) {
        console.error("Launch Error:", error);
        showToast("Failed to launch campaign: " + error.message, "error");
    } finally {
        launchBtn.innerHTML = '<i class="fa-solid fa-rocket"></i> Confirm & Launch';
        launchBtn.disabled = false;
    }
}

// ==========================================
// 5. MAIN LAUNCH BUTTON (Start Calling Campaign)
// ==========================================
async function launchVapiCampaign() {
    // 1. Validation: Check if a campaign is selected
    if (!activeCampaignId) {
        showToast("Please select a campaign first", "error");
        return;
    }

    try {
        // 2. Fetch campaign details to check if it's configured
        const response = await fetch(`/api/campaigns/${activeCampaignId}`);
        const campaign = await response.json();

        // 3. Check if campaign has assistant configuration
        if (!campaign.config || !campaign.config.agent_id || !campaign.config.voice_id) {
            showToast("Please configure the AI Agent and generate the script first (go to Script tab)", "warning");
            return;
        }

        // 4. Check if campaign has candidates
        const candResponse = await fetch(`/api/campaigns/${activeCampaignId}/candidates`);
        const candData = await candResponse.json();

        if (!candData.candidates || candData.candidates.length === 0) {
            showToast("Please add candidates first (go to Source Data tab)", "warning");
            return;
        }

        // 5. Campaign is ready - show success message
        showToast(`Campaign "${campaign.name}" is active and ready! 🚀 (${candData.candidates.length} candidates queued)`, "success");

        // Update status display
        const statusElement = document.querySelector('.vapi-content-header p span');
        if (statusElement) {
            statusElement.style.color = 'var(--success)';
            statusElement.innerHTML = '● Active';
        }

        // Optional: In the future, this is where you would trigger the actual Vapi calls
        // For now, just confirming that everything is configured correctly
        console.log("✅ Campaign Ready:", {
            campaign_id: activeCampaignId,
            campaign_name: campaign.name,
            agent_id: campaign.config.agent_id,
            voice_id: campaign.config.voice_id,
            candidate_count: candData.candidates.length
        });

    } catch (error) {
        console.error("Launch validation error:", error);
        showToast("Error checking campaign status", "error");
    }
}

// ==========================================
// 6. CAMPAIGN LIFECYCLE MANAGEMENT
// ==========================================

/**
 * Update tab visibility based on campaign status
 * @param {string} status - Campaign status: "In Design", "Active", "Stopped"
 */
function updateTabVisibility(status) {
    const tabs = document.querySelectorAll('.vapi-tab');

    // Define which tabs to restrict for Active campaigns
    const restrictedTabTexts = ['Interview Steps', 'AI Persona', 'Script'];

    tabs.forEach(tab => {
        const tabText = tab.innerText.trim();

        if (status === 'Active') {
            // Hide configuration tabs for active campaigns
            if (restrictedTabTexts.some(restricted => tabText.includes(restricted))) {
                tab.style.display = 'none';
            } else {
                tab.style.display = 'flex';
            }
        } else {
            // Show all tabs for In Design or Stopped campaigns
            tab.style.display = 'flex';
        }
    });
}

/**
 * Update header buttons based on campaign status
 * @param {string} status - Campaign status: "In Design", "Active", "Stopped"
 */
function updateHeaderButtons(status) {
    const launchBtn = document.getElementById('btn-launch-campaign');
    const stopBtn = document.getElementById('btn-stop-campaign');
    const statusText = document.getElementById('campaign-status-text');
    const header = document.querySelector('.vapi-content-header');

    if (status === 'In Design') {
        if (launchBtn) launchBtn.style.display = 'inline-flex';
        if (stopBtn) stopBtn.style.display = 'none';
        if (header) header.setAttribute('data-status', 'in-design');
        if (statusText) {
            statusText.innerHTML = '● In Design';
            statusText.style.color = 'var(--vapi-yellow)';
        }
    } else if (status === 'Active') {
        if (launchBtn) launchBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'inline-flex';
        if (header) header.setAttribute('data-status', 'active');
        if (statusText) {
            statusText.innerHTML = '● Active';
            statusText.style.color = 'var(--success)';
        }
    } else if (status === 'Stopped') {
        if (launchBtn) launchBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'none';
        if (header) header.setAttribute('data-status', 'stopped');
        if (statusText) {
            statusText.innerHTML = '● Stopped';
            statusText.style.color = 'var(--danger)';
        }
    }
}

/**
 * Stop an active campaign
 */
async function stopCampaign() {
    if (!activeCampaignId) {
        showToast("No campaign selected", "error");
        return;
    }

    if (!confirm('Are you sure you want to stop this campaign? This will pause all ongoing activities.')) {
        return;
    }

    try {
        const response = await fetch(`/api/campaigns/${activeCampaignId}/stop`, {
            method: 'POST'
        });

        const result = await response.json();

        if (response.ok) {
            showToast(result.message, 'success');

            // Update UI to Stopped state
            updateHeaderButtons('Stopped');
            updateTabVisibility('Stopped');

            // Reload campaign list to show updated status
            await loadUserCampaigns('audio');
        } else {
            throw new Error(result.detail || "Failed to stop campaign");
        }
    } catch (error) {
        console.error("Stop campaign error:", error);
        showToast("Failed to stop campaign: " + error.message, "error");
    }
}


// ==========================================
// STAGING AREA FUNCTIONS (For Active Campaigns)
// ==========================================

/**
 * Show the "Add to Campaign" button when there are staged candidates
 */
function showAddToCampaignButton() {
    // Check if button already exists
    let btn = document.getElementById('btn-add-staged-candidates');

    if (!btn) {
        // Create the button
        const tbody = document.getElementById('candidates-list-body');
        const tableContainer = tbody.closest('.data-table-container');

        if (!tableContainer) return;

        // Insert button after the table
        btn = document.createElement('button');
        btn.id = 'btn-add-staged-candidates';
        btn.className = 'btn btn-primary';
        btn.style.marginTop = '16px';
        btn.style.width = '100%';
        btn.innerHTML = '<i class="fa-solid fa-rocket"></i> Add to Active Campaign';
        btn.onclick = confirmAddStagedCandidates;

        tableContainer.parentElement.appendChild(btn);
    }

    // Update button text with count
    const count = stagedCandidates.length;
    if (count > 0) {
        btn.innerHTML = `<i class="fa-solid fa-rocket"></i> Add ${count} Candidate${count > 1 ? 's' : ''} to Campaign`;
        btn.style.display = 'block';
    } else {
        btn.style.display = 'none';
    }
}

/**
 * Confirm and save all staged candidates to the database
 */
async function confirmAddStagedCandidates() {
    if (stagedCandidates.length === 0) {
        showToast("No candidates to add", "info");
        return;
    }

    const btn = document.getElementById('btn-add-staged-candidates');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding to campaign...';
    btn.disabled = true;

    try {
        const response = await fetch("/api/candidates/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                campaign_id: activeCampaignId,
                candidates: stagedCandidates
            })
        });

        const result = await response.json();

        if (response.ok) {
            const added = result.added || 0;
            const skipped = result.skipped || 0;

            if (skipped > 0) {
                showToast(`Added ${added} candidates. Skipped ${skipped} duplicates.`, "warning");
            } else {
                showToast(`Successfully added ${added} candidates to active campaign!`, "success");
            }

            // Clear staging array
            stagedCandidates = [];

            // Reload the campaign to show the updated state
            const currentTitle = document.getElementById('vapi-campaign-title').innerText;
            const activeItem = document.querySelector('.vapi-list-item.active');
            await selectVapiCampaign(activeItem, currentTitle, activeCampaignId);

        } else {
            throw new Error(result.detail || "Failed to save candidates");
        }
    } catch (e) {
        console.error("Error saving staged candidates:", e);
        showToast("Failed to add candidates: " + e.message, "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Make functions globally accessible
window.confirmAddStagedCandidates = confirmAddStagedCandidates;
window.showAddToCampaignButton = showAddToCampaignButton;


// Duplicate report modal code removed - using the correct implementation at line 1743

// ============================================
// LOAD CAMPAIGN REPORTS (DYNAMICALLY)
// ============================================

/**
 * Load and display campaign reports when Reports tab is active
 */
async function loadCampaignReports() {
    if (!activeCampaignId) {
        console.log('No active campaign selected');
        return;
    }

    const tbody = document.getElementById('reports-table-body');
    if (!tbody) return;

    // Show loading state
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-secondary);"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading reports...</td></tr>';

    try {
        // Fetch candidates for this campaign
        const response = await fetch(`/api/campaigns/${activeCampaignId}/candidates`);
        const data = await response.json();

        tbody.innerHTML = '';

        if (data.candidates && data.candidates.length > 0) {
            data.candidates.forEach(candidate => {
                const row = document.createElement('tr');

                // Determine status badge
                const status = candidate.status || 'Pending';
                let badgeClass = 'badge-neutral';
                if (status === 'Selected' || status === 'Completed') badgeClass = 'badge-success';
                else if (status === 'Rejected') badgeClass = 'badge-danger';
                else if (status === 'Pending' || status === 'In Progress') badgeClass = 'badge-warning';

                // Generate mock AI score (will be replaced with real data)
                const mockScore = (Math.random() * 5 + 4.5).toFixed(1);
                const scoreColor = mockScore >= 7 ? '#10b981' : mockScore >= 5 ? '#f59e0b' : '#ef4444';

                // Format date
                const date = candidate.created_at ? new Date(candidate.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';

                row.innerHTML = `
                    <td>
                        <strong>${candidate.name}</strong><br>
                        <span style="font-size:10px; color:#71717a;">${candidate.email || '-'}</span>
                    </td>
                    <td><span class="badge ${badgeClass}">${status}</span></td>
                    <td><span style="color:${scoreColor}; font-weight:700;">${mockScore}/10</span></td>
                    <td style="color:#71717a;">${date}</td>
                    <td style="text-align: center;">
                        <button class="btn-view-report" onclick="openCandidateReport('${candidate.id}')" title="View Detailed Report">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </td>
                `;

                tbody.appendChild(row);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-tertiary);">No interview data available yet.</td></tr>';
        }

    } catch (error) {
        console.error('Error loading campaign reports:', error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--danger-text);">Failed to load reports</td></tr>';
    }
}

// Call this function when Reports tab is clicked
window.loadCampaignReports = loadCampaignReports;
