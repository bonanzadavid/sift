// --- Setup Environment Variables ---
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

// --- State Management ---
const state = {
    apiKey: apiKey !== "" ? apiKey : (localStorage.getItem('gemini_api_key') || ''),
    restrictions: localStorage.getItem('user_restrictions') || '',
    selectedOptions: JSON.parse(localStorage.getItem('user_options') || '[]'),
    history: JSON.parse(localStorage.getItem('scan_history') || '[]'),
    stream: null
};


// --- DOM Elements ---
const els = {
    cameraView: document.getElementById('camera-view'),
    analysisView: document.getElementById('analysis-view'),
    resultsContainer: document.getElementById('results-container'),
    emptyState: document.getElementById('empty-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    setupHint: document.getElementById('setup-hint'),
    video: document.getElementById('video-feed'),
    capturedImage: document.getElementById('captured-image'),
    loadingIndicator: document.getElementById('loading-indicator'),
    scanAnimation: document.getElementById('scan-animation'),
    productHeaderContent: document.getElementById('product-header-content'),
    settingsModal: document.getElementById('settings-modal'),
    historyModal: document.getElementById('history-modal'),
    historyList: document.getElementById('history-list'),
    apiKeyInput: document.getElementById('api-key'),
    apiKeyStatus: document.getElementById('api-key-status'),
    testKeyBtn: document.getElementById('test-key-btn'),
    restrictionsInput: document.getElementById('restrictions'),
    optionChips: document.querySelectorAll('.option-chip'),
    scanBtn: document.getElementById('scan-btn'),
    scanBtnText: document.getElementById('scan-btn-text'),

    // Result Fields
    prodName: document.getElementById('result-product-name'),
    prodDesc: document.getElementById('result-product-desc'),
    originBadge: document.getElementById('result-origin'),

    // Verdict Card
    cardVerdict: document.getElementById('card-verdict'),
    verdictBanner: document.getElementById('verdict-banner'),
    verdictIcon: document.getElementById('verdict-icon'),
    verdictText: document.getElementById('verdict-text'),
    verdictReason: document.getElementById('verdict-reason'),

    // Conditional Cards
    conditionalGrid: document.getElementById('conditional-analysis-grid'),
    cardDiabetes: document.getElementById('card-diabetes'),
    cardReligion: document.getElementById('card-religion'),
    diabetesInfo: document.getElementById('diabetes-info'),
    religiousInfo: document.getElementById('religious-info'),


    allergensList: document.getElementById('allergens-list'),
    factoryInfo: document.getElementById('factory-info'),
    alternativesList: document.getElementById('alternatives-list')
};


// --- Initialization ---
function init() {
    console.log("Sift App Initializing...");
    els.apiKeyInput.value = localStorage.getItem('gemini_api_key') || '';
    els.restrictionsInput.value = state.restrictions;
    updateOptionChips();
    checkConfig();
}


function checkConfig() {
    if (!state.apiKey) {
        // State: Missing Key
        els.setupHint.classList.remove('hidden');
        els.scanBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
        els.scanBtn.classList.add('bg-rose-600', 'hover:bg-rose-700');
        els.scanBtnText.innerText = "Add Key";
        const icon = els.scanBtn.querySelector('i');
        if (icon) icon.className = "ph-bold ph-gear text-xl";
    } else {
        // State: Ready
        els.setupHint.classList.add('hidden');
        els.scanBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
        els.scanBtn.classList.remove('bg-rose-600', 'hover:bg-rose-700');
        els.scanBtnText.innerText = "Scan Food";
        const icon = els.scanBtn.querySelector('i');
        if (icon) icon.className = "ph-bold ph-camera text-xl";
    }
}


// --- Button Logic ---
window.handleMainButtonClick = function () {
    if (!state.apiKey) {
        toggleSettings();
    } else {
        openCamera();
    }
}


// --- Modal Toggles ---
function toggleModal(modal) {
    const isHidden = modal.classList.contains('hidden');
    if (modal.id === 'settings-modal' && isHidden) els.apiKeyStatus.classList.add('hidden');

    if (isHidden) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('div').classList.remove('translate-y-full');
        }, 10);
    } else {
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('translate-y-full');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}


window.toggleSettings = function () { toggleModal(els.settingsModal); }
window.toggleHistory = function () {
    renderHistory();
    toggleModal(els.historyModal);
}


// --- Settings / Options Logic ---
window.toggleOption = function (btn, value) {
    if (state.selectedOptions.includes(value)) {
        state.selectedOptions = state.selectedOptions.filter(item => item !== value);
        btn.classList.remove('selected');
    } else {
        state.selectedOptions.push(value);
        btn.classList.add('selected');
    }
}


function updateOptionChips() {
    els.optionChips.forEach(btn => {
        // Parse value from click handler attribute essentially
        const val = btn.innerText.trim(); // Simplified match
        if (state.selectedOptions.some(opt => val.includes(opt))) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}


window.saveSettings = function () {
    const newKey = els.apiKeyInput.value.trim();
    const newRest = els.restrictionsInput.value.trim();

    if (newKey) {
        localStorage.setItem('gemini_api_key', newKey);
        state.apiKey = newKey;
    } else {
        localStorage.removeItem('gemini_api_key');
        state.apiKey = apiKey !== "" ? apiKey : "";
    }


    localStorage.setItem('user_restrictions', newRest);
    state.restrictions = newRest;
    localStorage.setItem('user_options', JSON.stringify(state.selectedOptions));

    checkConfig();
    toggleSettings();
}


window.testApiKey = async function () {
    const keyToTest = els.apiKeyInput.value.trim() || state.apiKey;
    if (!keyToTest) {
        showKeyStatus("error", "Enter a key first.");
        return;
    }


    els.testKeyBtn.innerText = "...";
    els.testKeyBtn.disabled = true;


    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${keyToTest}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] })
        });


        const data = await response.json();
        if (response.ok && !data.error) {
            showKeyStatus("success", "Verified!");
        } else {
            showKeyStatus("error", "Invalid Key");
        }
    } catch (e) {
        showKeyStatus("error", "Connection failed");
    } finally {
        els.testKeyBtn.innerText = "TEST";
        els.testKeyBtn.disabled = false;
    }
}


function showKeyStatus(type, msg) {
    els.apiKeyStatus.classList.remove('hidden', 'text-emerald-600', 'text-rose-600');
    els.apiKeyStatus.innerHTML = "";
    if (type === "success") {
        els.apiKeyStatus.classList.add('text-emerald-600');
        els.apiKeyStatus.innerHTML = `<i class="ph-bold ph-check-circle"></i> ${msg}`;
    } else {
        els.apiKeyStatus.classList.add('text-rose-600');
        els.apiKeyStatus.innerHTML = `<i class="ph-bold ph-warning-circle"></i> ${msg}`;
    }
}


// --- History Logic ---
function addToHistory(data) {
    const item = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        data: data
    };
    // Prepend
    state.history.unshift(item);
    // Limit to 20
    if (state.history.length > 20) state.history.pop();
    localStorage.setItem('scan_history', JSON.stringify(state.history));
}


function renderHistory() {
    els.historyList.innerHTML = "";
    if (state.history.length === 0) {
        els.historyList.innerHTML = '<p class="text-center text-slate-400 py-10 text-sm">No scans yet.</p>';
        return;
    }

    state.history.forEach(item => {
        const safe = item.data.safety_status === "SAFE";
        const unsafe = item.data.safety_status === "UNSAFE";
        let colorClass = safe ? "text-emerald-600 bg-emerald-50" : (unsafe ? "text-rose-600 bg-rose-50" : "text-amber-600 bg-amber-50");

        const div = document.createElement('div');
        div.className = "flex items-center gap-4 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition border border-slate-100";
        div.onclick = () => loadHistoryItem(item);

        div.innerHTML = `
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${colorClass}">
                ${safe ? '<i class="ph-bold ph-check"></i>' : (unsafe ? '<i class="ph-bold ph-warning"></i>' : '<i class="ph-bold ph-question"></i>')}
            </div>
            <div class="flex-1">
                <h4 class="font-bold text-slate-900 text-sm line-clamp-1">${item.data.product_name || "Unknown"}</h4>
                <p class="text-xs text-slate-500">${item.timestamp}</p>
            </div>
            <i class="ph-bold ph-caret-right text-slate-300"></i>
        `;
        els.historyList.appendChild(div);
    });
}


function loadHistoryItem(item) {
    toggleHistory(); // Close modal
    els.emptyState.classList.add('hidden');
    els.analysisView.classList.remove('hidden');
    els.capturedImage.src = "";
    els.productHeaderContent.classList.remove('opacity-0');
    els.productHeaderContent.classList.add('opacity-100');
    displayResult(item.data);
}


window.clearHistory = function () {
    state.history = [];
    localStorage.removeItem('scan_history');
    renderHistory();
}




// --- Camera & File Logic ---
async function openCamera() {
    if (!state.apiKey) { toggleSettings(); return; }
    console.log("Opening camera...");

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        alert("Camera requires HTTPS. Please use the file upload button instead.");
        return;
    }


    try {
        els.cameraView.classList.remove('hidden');

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Camera API not available");
        }


        try {
            state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        } catch (e) {
            console.log("Environment cam failed, trying default.");
            state.stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        els.video.srcObject = state.stream;
        await els.video.play();
    } catch (err) {
        console.error("Camera Init Error:", err);
        alert("Camera access failed or is not supported. Opening file picker instead.");
        closeCamera();
        document.getElementById('file-upload').click();
    }
}


window.closeCamera = function () {
    els.cameraView.classList.add('hidden');
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null;
    }
}


window.capturePhoto = function () {
    const canvas = document.createElement('canvas');
    canvas.width = els.video.videoWidth;
    canvas.height = els.video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(els.video, 0, 0);
    processImage(canvas.toDataURL('image/jpeg', 0.8));
    closeCamera();
}


window.handleFileUpload = function (event) {
    const file = event.target.files[0];
    if (!state.apiKey) { toggleSettings(); return; }
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => processImage(e.target.result);
        reader.readAsDataURL(file);
    }
}


// --- App Flow ---
window.resetApp = function () {
    els.analysisView.classList.add('hidden');
    els.resultsContainer.classList.add('hidden');
    els.errorState.classList.add('hidden');
    els.productHeaderContent.classList.remove('opacity-100');
    els.productHeaderContent.classList.add('opacity-0');
    els.emptyState.classList.remove('hidden');
    els.capturedImage.src = '';

    els.prodName.innerText = "";
    els.prodDesc.innerText = "";
    els.loadingIndicator.classList.remove('hidden');
    els.scanAnimation.classList.add('hidden');
}


function showError(msg) {
    els.emptyState.classList.add('hidden');
    els.analysisView.classList.add('hidden');
    els.errorState.classList.remove('hidden');
    els.errorState.classList.add('flex');
    els.errorMessage.innerText = msg;
}


function processImage(base64Image) {
    console.log("Processing image...");
    els.emptyState.classList.add('hidden');
    els.errorState.classList.add('hidden');
    els.analysisView.classList.remove('hidden');
    els.capturedImage.src = base64Image;
    els.scanAnimation.classList.remove('hidden');

    const base64Data = base64Image.split(',')[1];
    analyzeWithGemini(base64Data);
}


function fireConfetti() {
    const colors = ['#34d399', '#10b981', '#fbbf24', '#60a5fa', '#f472b6'];
    const container = document.body;

    for (let i = 0; i < 50; i++) {
        const conf = document.createElement('div');
        conf.classList.add('confetti');
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        conf.style.animationDuration = (Math.random() * 2 + 2) + 's';
        conf.style.top = '-10px';

        container.appendChild(conf);

        setTimeout(() => conf.remove(), 4000);
    }
}


async function analyzeWithGemini(base64Data) {
    if (!state.apiKey || !state.apiKey.trim()) { toggleSettings(); resetApp(); return; }


    const customRestrictions = state.restrictions.trim();
    const options = state.selectedOptions.join(", ");
    const fullProfile = `${options} ${customRestrictions ? ", " + customRestrictions : ""}`.trim() || "No specific restrictions.";


    const schema = {
        type: "OBJECT",
        properties: {
            product_name: { type: "STRING" },
            origin_country: { type: "STRING" },
            product_description: { type: "STRING" },
            safety_status: { type: "STRING", enum: ["SAFE", "UNSAFE", "UNCERTAIN"] },
            safety_reasoning: { type: "STRING" },
            diabetes_analysis: { type: "STRING" },
            religious_analysis: { type: "STRING" },
            allergens_detected: { type: "ARRAY", items: { type: "STRING" } },
            cross_contamination_factory_info: { type: "STRING" },
            alternatives: { type: "ARRAY", items: { type: "STRING" } }
        }
    };


    const prompt = `
    Analyze this food image (front of package, nutrition label, or ingredients).
    User Profile: "${fullProfile}".


    1. **Identify Product**: Name, Brand, & Origin.
    2. **Deep Allergen Scan**:
       - Detect ALL major allergens (Milk, Eggs, Fish, Shellfish, Tree Nuts, Peanuts, Wheat, Soy, Sesame).
       - Look for hidden ingredients (e.g., "Casein" for milk, "Albumin" for egg).
       - If ingredients aren't clear, use GENERAL KNOWLEDGE about the product to infer likely allergens.
    3. **Safety Verdict**: Compare findings against User Profile. Be STRICT.
    4. **Specific Checks**:
       - Diabetes: Analyze sugar/carbs.
       - Religion: Check for pork/alcohol/gelatin.
    5. **Factory Info**: Look for "May contain" or "Shared equipment" warnings.
    6. **Alternatives**: Suggest 2-3 specific, safer brand-name products. CRITICAL: These MUST be completely free of ALL the User's dietary restrictions.


    Keep text simple. Return JSON matching the schema.
    `;


    try {
        console.log("Sending to Gemini API...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${state.apiKey.trim()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: base64Data } }] }],
                generationConfig: { responseMimeType: "application/json", responseSchema: schema }
            })
        });


        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        if (!data.candidates) throw new Error("No response from AI.");


        const result = JSON.parse(data.candidates[0].content.parts[0].text);

        // Add to history
        addToHistory(result);

        displayResult(result);


    } catch (error) {
        console.error("Gemini Error:", error);
        if (error.message.includes("API key") || error.message.includes("key not valid")) {
            localStorage.removeItem('gemini_api_key');
            state.apiKey = '';
            checkConfig();
            showError("Invalid API Key. Please update in settings.");
        } else {
            showError("Analysis failed: " + error.message);
        }
    }
}


function displayResult(data) {
    console.log("Displaying results...");
    els.loadingIndicator.classList.add('hidden');
    els.scanAnimation.classList.add('hidden');

    els.resultsContainer.classList.remove('hidden');
    els.productHeaderContent.classList.remove('opacity-0');
    els.productHeaderContent.classList.add('opacity-100');


    els.prodName.innerText = data.product_name || "Unknown Product";
    els.prodDesc.innerText = "Details found from image.";
    if (data.origin_country && data.origin_country !== "Unknown") {
        els.originBadge.innerText = data.origin_country;
        els.originBadge.classList.remove('hidden');
    } else {
        els.originBadge.classList.add('hidden');
    }


    const status = data.safety_status;
    els.verdictText.innerText = status;
    els.verdictReason.innerText = data.safety_reasoning;


    els.verdictBanner.className = "p-6 flex flex-col items-center text-center gap-2 transition-colors duration-500";

    if (status === "SAFE") {
        els.cardVerdict.classList.add('bounce-in');
        els.verdictBanner.classList.add('bg-emerald-500');
        els.verdictIcon.innerHTML = '<i class="ph-fill ph-check"></i>';
        els.verdictIcon.classList.add('text-emerald-500', 'bg-white');
        els.verdictIcon.classList.remove('text-white', 'bg-white/20');
        fireConfetti();
    } else if (status === "UNSAFE") {
        els.cardVerdict.classList.remove('bounce-in');
        els.verdictBanner.classList.add('bg-rose-500');
        els.verdictIcon.innerHTML = '<i class="ph-fill ph-warning"></i>';
        els.verdictIcon.classList.add('text-rose-500', 'bg-white');
        els.verdictIcon.classList.remove('text-white', 'bg-white/20');
    } else {
        els.cardVerdict.classList.remove('bounce-in');
        els.verdictBanner.classList.add('bg-amber-400');
        els.verdictIcon.innerHTML = '<i class="ph-fill ph-question"></i>';
        els.verdictIcon.classList.add('text-amber-500', 'bg-white');
        els.verdictIcon.classList.remove('text-white', 'bg-white/20');
    }


    const showDiabetes = state.selectedOptions.includes("Diabetes") && data.diabetes_analysis;
    const showReligion = (state.selectedOptions.some(opt => ["Halal", "Kosher"].includes(opt))) && data.religious_analysis;

    if (showDiabetes || showReligion) {
        els.conditionalGrid.classList.remove('hidden');

        if (showDiabetes) {
            els.cardDiabetes.classList.remove('hidden');
            els.diabetesInfo.innerText = data.diabetes_analysis;
        } else {
            els.cardDiabetes.classList.add('hidden');
        }


        if (showReligion) {
            els.cardReligion.classList.remove('hidden');
            els.religiousInfo.innerText = data.religious_analysis;
        } else {
            els.cardReligion.classList.add('hidden');
        }
    } else {
        els.conditionalGrid.classList.add('hidden');
    }




    els.allergensList.innerHTML = "";
    const allergens = data.allergens_detected || [];
    if (allergens.length === 0) {
        els.allergensList.innerHTML = `<span class="text-xs text-slate-400 italic">None detected</span>`;
    } else {
        allergens.forEach(alg => {
            const tag = document.createElement('span');
            tag.className = "px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold uppercase tracking-wide rounded-md border border-rose-100";
            tag.innerText = alg;
            els.allergensList.appendChild(tag);
        });
    }


    els.factoryInfo.innerText = data.cross_contamination_factory_info || "No factory data.";


    els.alternativesList.innerHTML = "";
    const alts = data.alternatives || [];
    if (alts.length === 0) {
        els.alternativesList.innerHTML = `<li class="text-emerald-200 italic text-xs">No specific alternatives found.</li>`;
    } else {
        alts.forEach(alt => {
            const li = document.createElement('li');
            li.className = "flex items-start gap-3 bg-white/10 p-3 rounded-xl border border-white/5";
            li.innerHTML = `
                <div class="mt-0.5 flex-shrink-0 text-emerald-400"><i class="ph-fill ph-check-circle text-lg"></i></div>
                <span class="text-sm font-medium text-emerald-50 leading-snug">${alt}</span>
            `;
            els.alternativesList.appendChild(li);
        });
    }
}


init();
