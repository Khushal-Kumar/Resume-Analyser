// --- VARIABLES & STATE ---
let currentTheme = localStorage.getItem('theme') || 'dark';
let savedApiKey = localStorage.getItem('gemini_api_key') || '';

// DOM Elements
const body = document.body;
const themeToggleBtn = document.getElementById('themeToggleBtn');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const settingsModal = document.getElementById('settingsModal');
const apiKeyInput = document.getElementById('apiKeyInput');
const toggleApiKeyVisibility = document.getElementById('toggleApiKeyVisibility');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');

const form = document.getElementById('analyzerForm');
const fileInput = document.getElementById('resumeInput');
const dropZone = document.getElementById('dropZone');
const dropZoneDefault = document.getElementById('dropZoneDefault');
const filePreview = document.getElementById('filePreview');
const fileNameSpan = document.getElementById('fileName');
const removeBtn = document.getElementById('removeFile');
const jobDescriptionInput = document.getElementById('jobDescription');
const submitBtn = document.getElementById('submitBtn');

const loaderContainer = document.getElementById('loaderContainer');
const loaderStatus = document.getElementById('loaderStatus');
const resultsContainer = document.getElementById('resultsContainer');
const mockWarningBanner = document.getElementById('mockWarningBanner');

// Tab Panel elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

// Analysis Result targets
const scoreValueEl = document.getElementById('scoreValue');
const scoreFillRing = document.getElementById('scoreFillRing');
const ratingBadge = document.getElementById('ratingBadge');
const analysisSummaryEl = document.getElementById('analysisSummary');
const strengthsList = document.getElementById('strengthsList');
const weaknessesList = document.getElementById('weaknessesList');
const proTipText = document.getElementById('proTipText');
const parsedTextContainer = document.getElementById('parsedTextContainer');
const matchedKeywordsPool = document.getElementById('matchedKeywordsPool');
const missingKeywordsPool = document.getElementById('missingKeywordsPool');
const matchedCountEl = document.getElementById('matchedCount');
const missingCountEl = document.getElementById('missingCount');

// List of standard industry technology keywords for client-side comparison
const techSkillsDatabase = [
    "python", "javascript", "typescript", "react", "vue", "angular", "node", "express", 
    "flask", "django", "fastapi", "spring boot", "java", "c++", "c#", "ruby", "php", 
    "html", "css", "sql", "postgresql", "mongodb", "mysql", "redis", "aws", "azure", 
    "gcp", "docker", "kubernetes", "git", "github", "gitlab", "ci/cd", "terraform", 
    "jenkins", "devops", "agile", "scrum", "machine learning", "deep learning", 
    "data science", "pandas", "numpy", "tensorflow", "pytorch", "spark", "graphql", 
    "rest api", "microservices", "unit testing", "linux", "jira", "figma", "tableau",
    "power bi", "excel", "kubernetes", "docker-compose", "serverless", "sass", "webpack",
    "next.js", "nuxt.js", "nest.js", "go", "rust", "r programming", "kotlin", "swift",
    "objective-c", "flutter", "react native", "redux", "graphql", "mongodb", "firebase"
];

// --- THEME MANAGEMENT ---
function initTheme() {
    if (currentTheme === 'light') {
        body.classList.add('light-theme');
        themeToggleBtn.innerHTML = '<i class="ri-moon-line"></i>';
    } else {
        body.classList.remove('light-theme');
        themeToggleBtn.innerHTML = '<i class="ri-sun-line"></i>';
    }
}

themeToggleBtn.addEventListener('click', () => {
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        themeToggleBtn.innerHTML = '<i class="ri-sun-line"></i>';
        currentTheme = 'dark';
    } else {
        body.classList.add('light-theme');
        themeToggleBtn.innerHTML = '<i class="ri-moon-line"></i>';
        currentTheme = 'light';
    }
    localStorage.setItem('theme', currentTheme);
});

// --- SETTINGS MODAL ---
function initSettings() {
    apiKeyInput.value = savedApiKey;
}

openSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('active');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('active');
});

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.remove('active');
    }
});

// Toggle API Key Masking
toggleApiKeyVisibility.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleApiKeyVisibility.innerHTML = '<i class="ri-eye-off-line"></i>';
    } else {
        apiKeyInput.type = 'password';
        toggleApiKeyVisibility.innerHTML = '<i class="ri-eye-line"></i>';
    }
});

// Save API Key Settings
saveApiKeyBtn.addEventListener('click', () => {
    savedApiKey = apiKeyInput.value.trim();
    localStorage.setItem('gemini_api_key', savedApiKey);
    settingsModal.classList.remove('active');
    
    // Quick notification banner/alert
    const tempNotification = document.createElement('div');
    tempNotification.style.cssText = "position: fixed; bottom: 20px; right: 20px; background: var(--success); color: white; padding: 12px 24px; border-radius: 8px; z-index: 3000; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: fadeInUp 0.3s ease;";
    tempNotification.innerHTML = '<i class="ri-checkbox-circle-line"></i> API Key Settings Saved';
    document.body.appendChild(tempNotification);
    setTimeout(() => {
        tempNotification.style.animation = "fadeIn 0.3s ease reverse";
        setTimeout(() => tempNotification.remove(), 300);
    }, 2500);
});

// Clear API Key Settings
clearApiKeyBtn.addEventListener('click', () => {
    apiKeyInput.value = '';
    savedApiKey = '';
    localStorage.removeItem('gemini_api_key');
});

// --- FILE UPLOADER DRAG & DROP ---
dropZone.addEventListener('click', (e) => {
    if (e.target !== removeBtn && !removeBtn.contains(e.target)) {
        fileInput.click();
    }
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-active');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-active');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');
    if (e.dataTransfer.files.length > 0) {
        handleUploadedFile(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        handleUploadedFile(fileInput.files[0]);
    }
});

function handleUploadedFile(file) {
    if (file.type === 'application/pdf') {
        dropZoneDefault.style.display = 'none';
        filePreview.style.display = 'flex';
        fileNameSpan.innerText = file.name;
        
        // Sync DataTransfer list
        if (fileInput.files.length === 0 || fileInput.files[0] !== file) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
        }
    } else {
        alert('Format error: Please select a PDF file only.');
    }
}

removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.value = '';
    filePreview.style.display = 'none';
    dropZoneDefault.style.display = 'block';
});

const loadSampleBtn = document.getElementById('loadSampleBtn');
if (loadSampleBtn) {
    loadSampleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        const mockFile = new File(["%PDF-1.4 Mock PDF Content..."], "sample_resume.pdf", { type: "application/pdf" });
        handleUploadedFile(mockFile);
        
        jobDescriptionInput.value = "Python Developer with experience in Flask, React, Docker, and AWS cloud microservices.";
        
        const tempNotification = document.createElement('div');
        tempNotification.style.cssText = "position: fixed; bottom: 20px; right: 20px; background: var(--primary); color: white; padding: 12px 24px; border-radius: 8px; z-index: 3000; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: fadeInUp 0.3s ease;";
        tempNotification.innerHTML = '<i class="ri-file-info-line"></i> Loaded sample resume & job description.';
        document.body.appendChild(tempNotification);
        setTimeout(() => {
            tempNotification.style.animation = "fadeIn 0.3s ease reverse";
            setTimeout(() => tempNotification.remove(), 300);
        }, 2500);
    });
}

// --- TAB TRANSITIONS ---
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from buttons
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Toggle active panel
        const targetTab = btn.getAttribute('data-tab');
        tabPanels.forEach(panel => {
            if (panel.id === targetTab) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });
    });
});

// --- SUBMIT & RUN ANALYSIS ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (fileInput.files.length === 0) {
        alert("Please select a PDF resume file to analyze.");
        return;
    }

    // Hide old results
    resultsContainer.style.display = 'none';
    
    // Toggle Loading state UI
    form.style.display = 'none';
    loaderContainer.style.display = 'flex';
    submitBtn.disabled = true;

    // Loading status cycling animation
    const statusMessages = [
        { time: 0, text: "Extracting text from PDF resume...", sub: "Running locally using robust PDF parsers." },
        { time: 1800, text: "Searching core skill match keywords...", sub: "Mapping terms against technology databases." },
        { time: 3600, text: "Consulting Google Gemini AI for expert critique...", sub: "Evaluating layout, experience structure, and metrics." },
        { time: 5400, text: "Analyzing job description compatibility...", sub: "Structuring final recommendations and match score." }
    ];

    statusMessages.forEach(msg => {
        setTimeout(() => {
            if (loaderContainer.style.display === 'flex') {
                loaderStatus.innerText = msg.text;
                loaderContainer.querySelector('.loader-sub').innerText = msg.sub;
            }
        }, msg.time);
    });

    const formData = new FormData();
    formData.append('resume', fileInput.files[0]);
    formData.append('job_description', jobDescriptionInput.value.trim());
    formData.append('api_key', savedApiKey);

    try {
        const headers = {};
        if (savedApiKey) {
            headers['X-Gemini-API-Key'] = savedApiKey;
        }

        const response = await fetch('http://127.0.0.1:5000/analyze', {
            method: 'POST',
            body: formData,
            headers: headers
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Server response failed.");
        }

        const data = await response.json();
        
        // Render
        displayResults(data);

    } catch (error) {
        console.error(error);
        alert("Analysis Failed: " + error.message + "\nEnsure your backend app.py is running on http://127.0.0.1:5000");
        
        // Restore form UI
        form.style.display = 'block';
        loaderContainer.style.display = 'none';
        submitBtn.disabled = false;
    }
});

// --- RENDER DASHBOARD RESULTS ---
function displayResults(data) {
    // Hide loader, show results
    loaderContainer.style.display = 'none';
    form.style.display = 'block';
    submitBtn.disabled = false;
    resultsContainer.style.display = 'block';

    // Show warning banner if using mockup mode
    if (data.is_mock) {
        mockWarningBanner.style.display = 'flex';
    } else {
        mockWarningBanner.style.display = 'none';
    }

    // Set model fallback label
    const modelLabel = document.getElementById('activeModelUsed');
    if (data.is_mock) {
        modelLabel.innerText = "Processed locally (Demo Mode)";
    } else {
        modelLabel.innerText = "Analyzed with Gemini 1.5 Flash";
    }

    // 1. Animated Score Progress ring
    animateScoreRing(data.score || 0);

    // 2. Summary
    analysisSummaryEl.innerText = data.summary || "No summary provided.";

    // 3. Strengths List
    strengthsList.innerHTML = '';
    const strengths = data.strengths || [];
    if (strengths.length > 0) {
        strengths.forEach(s => {
            const li = document.createElement('li');
            li.innerHTML = `<i class="ri-check-line"></i> <span>${s}</span>`;
            strengthsList.appendChild(li);
        });
    } else {
        strengthsList.innerHTML = '<li><i class="ri-check-line"></i> Clear structure overall.</li>';
    }

    // 4. Weaknesses List
    weaknessesList.innerHTML = '';
    const weaknesses = data.weaknesses || [];
    if (weaknesses.length > 0) {
        weaknesses.forEach(w => {
            const li = document.createElement('li');
            li.innerHTML = `<i class="ri-close-line"></i> <span>${w}</span>`;
            weaknessesList.appendChild(li);
        });
    } else {
        weaknessesList.innerHTML = '<li><i class="ri-close-line"></i> No severe visual layout gaps.</li>';
    }

    // 5. Suggestion / Pro tip
    proTipText.innerText = data.suggestion || "Tailor experience bullet points dynamically.";

    // 6. ATS Text simulator
    parsedTextContainer.textContent = data.parsed_text || "No readable parsed text found in PDF.";

    // 7. Client-side Keyword analysis
    runClientKeywordAnalysis(data.parsed_text || '', jobDescriptionInput.value.trim());

    // Auto-scroll to results dashboard
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

// Animate Score SVG ring and Text Value
function animateScoreRing(targetScore) {
    let currentVal = 0;
    const duration = 1500; // ms
    const stepTime = Math.max(Math.floor(duration / targetScore), 15);
    
    // Set score-fill-ring color based on range
    let color = 'var(--danger)';
    let badgeClass = 'rating-critical';
    let badgeText = 'Needs Revisions';

    if (targetScore >= 80) {
        color = 'var(--success)';
        badgeClass = 'rating-excellent';
        badgeText = 'Strong Match';
    } else if (targetScore >= 60) {
        color = 'var(--warning)';
        badgeClass = 'rating-good';
        badgeText = 'Moderate Match';
    }

    scoreFillRing.style.stroke = color;
    
    // Update Rating Badge
    ratingBadge.className = `rating-badge ${badgeClass}`;
    ratingBadge.innerText = badgeText;

    const timer = setInterval(() => {
        currentVal++;
        if (currentVal >= targetScore) {
            currentVal = targetScore;
            clearInterval(timer);
        }
        scoreValueEl.innerText = `${currentVal}%`;
        
        // Circle stroke offset animation (radius = 70, circumference = 2 * PI * r = 440)
        const circumference = 440;
        const offset = circumference - (currentVal / 100) * circumference;
        scoreFillRing.style.strokeDashoffset = offset;
    }, stepTime);
}

// Client-side Keyword Matcher Algorithm
function runClientKeywordAnalysis(resumeText, jobText) {
    matchedKeywordsPool.innerHTML = '';
    missingKeywordsPool.innerHTML = '';

    const cleanResume = resumeText.toLowerCase();
    const cleanJob = jobText.toLowerCase();

    let matchedKeywords = [];
    let missingKeywords = [];

    // If job description is empty, show parsed resume skills
    if (!jobText || jobText.trim() === '') {
        // Just extract matches from the database that are present in the resume
        techSkillsDatabase.forEach(skill => {
            const skillPattern = new RegExp(`\\b${escapeRegExp(skill)}\\b`, 'i');
            if (skillPattern.test(cleanResume)) {
                matchedKeywords.push(skill);
            }
        });
        
        matchedCountEl.innerText = matchedKeywords.length;
        missingCountEl.innerText = 'N/A';

        if (matchedKeywords.length > 0) {
            matchedKeywords.forEach(skill => {
                const pill = document.createElement('span');
                pill.className = 'keyword-pill matched';
                pill.innerHTML = `<i class="ri-check-line"></i> ${capitalizeFirstLetter(skill)}`;
                matchedKeywordsPool.appendChild(pill);
            });
        } else {
            matchedKeywordsPool.innerHTML = '<span class="keyword-pool-empty">No common industry technical keywords found.</span>';
        }

        missingKeywordsPool.innerHTML = '<span class="keyword-pool-empty">Paste a Job Description in the form to view missing keywords.</span>';
        return;
    }

    // Identify target keywords in the Job Description first
    let targetJobSkills = [];
    techSkillsDatabase.forEach(skill => {
        const skillPattern = new RegExp(`\\b${escapeRegExp(skill)}\\b`, 'i');
        if (skillPattern.test(cleanJob)) {
            targetJobSkills.push(skill);
        }
    });

    // Check which target job skills are in the resume
    targetJobSkills.forEach(skill => {
        const skillPattern = new RegExp(`\\b${escapeRegExp(skill)}\\b`, 'i');
        if (skillPattern.test(cleanResume)) {
            matchedKeywords.push(skill);
        } else {
            missingKeywords.push(skill);
        }
    });

    matchedCountEl.innerText = matchedKeywords.length;
    missingCountEl.innerText = missingKeywords.length;

    // Render Matched
    if (matchedKeywords.length > 0) {
        matchedKeywords.forEach(skill => {
            const pill = document.createElement('span');
            pill.className = 'keyword-pill matched';
            pill.innerHTML = `<i class="ri-check-line"></i> ${capitalizeFirstLetter(skill)}`;
            matchedKeywordsPool.appendChild(pill);
        });
    } else {
        matchedKeywordsPool.innerHTML = '<span class="keyword-pool-empty">0 keywords matched. Review job description skill alignment.</span>';
    }

    // Render Missing
    if (missingKeywords.length > 0) {
        missingKeywords.forEach(skill => {
            const pill = document.createElement('span');
            pill.className = 'keyword-pill missing';
            pill.innerHTML = `<i class="ri-add-line"></i> ${capitalizeFirstLetter(skill)}`;
            missingKeywordsPool.appendChild(pill);
        });
    } else {
        missingKeywordsPool.innerHTML = '<span class="keyword-pool-empty">Awesome! No key technical keywords are missing.</span>';
    }
}

// Helpers
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function capitalizeFirstLetter(string) {
    return string.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// --- PRINT LAYOUT ---
function printReport() {
    window.print();
}

// --- INITIALIZERS ---
initTheme();
initSettings();