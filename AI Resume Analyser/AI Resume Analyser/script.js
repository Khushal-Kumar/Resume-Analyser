// --- VARIABLES ---
const form = document.getElementById('analyzerForm');
const fileInput = document.getElementById('resumeInput');
const btn = document.querySelector('.btn-analyze');
const dropZone = document.getElementById('dropZone');
const filePreview = document.getElementById('filePreview');
const fileNameSpan = document.getElementById('fileName');
const removeBtn = document.getElementById('removeFile');
const defaultContent = dropZone.querySelector('.default-content'); // Ensure this class exists in HTML

// --- PART 1: DRAG & DROP LOGIC (Restored) ---

// Click to Browse
dropZone.addEventListener('click', (e) => {
    // Only open file dialog if we didn't click the "Remove" button
    if (e.target !== removeBtn) {
        fileInput.click();
    }
});

// Drag Effects
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
        handleFile(e.dataTransfer.files[0]);
    }
});

// File Selected via Click
fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        handleFile(fileInput.files[0]);
    }
});

// Handle File Display
function handleFile(file) {
    if (file.type === 'application/pdf') {
        // Show Preview, Hide Default Text
        if(defaultContent) defaultContent.style.display = 'none';
        filePreview.style.display = 'inline-flex'; 
        fileNameSpan.innerText = file.name;
        
        // Manually assign the file to the input if it came from Drop
        // (This is tricky in JS, so we rely on the FormData to grab it later if needed,
        // but for 'click' it works automatically. For drop, we need to ensure the form sees it.)
        if (fileInput.files.length === 0) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
        }

    } else {
        alert('Please upload a PDF file only.');
    }
}

// Remove File
removeBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Stop bubbling to dropZone click
    fileInput.value = '';
    
    // Reset UI
    filePreview.style.display = 'none';
    if(defaultContent) defaultContent.style.display = 'block';
});


// --- PART 2: BACKEND CONNECTION LOGIC ---

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (fileInput.files.length === 0) {
        alert("Please select a file!");
        return;
    }

    // Show Loading State
    const originalBtnContent = btn.innerHTML;
    btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Analyzing...';
    btn.style.opacity = '0.8';
    btn.disabled = true;

    // Prepare Data
    const formData = new FormData();
    formData.append('resume', fileInput.files[0]);
    
    // Get Job Description (handle if element is missing)
    const jobDescEl = document.getElementById('jobDescription');
    const jobDescVal = jobDescEl ? jobDescEl.value : "General Software Role";
    formData.append('job_description', jobDescVal);

    try {
        // Send to Python Backend
        const response = await fetch('http://127.0.0.1:5000/analyze', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();

        // Check for server errors
        if (data.error) throw new Error(data.error);

        // Display the Score & Suggestions
        displayResults(data);

    } catch (error) {
        console.error(error);
        alert("Analysis Failed: " + error.message);
    } finally {
        // Reset Button
        btn.innerHTML = originalBtnContent;
        btn.style.opacity = '1';
        btn.disabled = false;
    }
});

// Render Results Function
function displayResults(data) {
    const resultsHTML = `
        <div class="results-container" style="margin-top: 40px; text-align: left; animation: fadeIn 0.5s ease;">
            
            <div style="background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; border: 1px solid #e2e8f0;">
                <div>
                    <h3 style="margin-bottom: 5px; color: #1e293b; font-size: 1.5rem;">Resume Score</h3>
                    <p style="color: #64748b;">${data.summary || "Analysis Complete"}</p>
                </div>
                <div style="min-width: 80px; height: 80px; background: ${getColor(data.score)}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 800; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
                    ${data.score}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px;">
                
                <div style="background: #f0fdf4; padding: 25px; border-radius: 16px; border: 1px solid #bbf7d0;">
                    <h4 style="color: #166534; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                        <i class="ri-checkbox-circle-fill"></i> Strong Points
                    </h4>
                    <ul style="padding-left: 20px; color: #14532d; line-height: 1.6;">
                        ${data.strengths.map(s => `<li style="margin-bottom: 8px;">${s}</li>`).join('')}
                    </ul>
                </div>

                <div style="background: #fef2f2; padding: 25px; border-radius: 16px; border: 1px solid #fecaca;">
                    <h4 style="color: #991b1b; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                        <i class="ri-alert-fill"></i> Improvements Needed
                    </h4>
                    <ul style="padding-left: 20px; color: #7f1d1d; line-height: 1.6;">
                        ${data.weaknesses.map(w => `<li style="margin-bottom: 8px;">${w}</li>`).join('')}
                    </ul>
                </div>
            </div>

            <div style="background: #eff6ff; padding: 20px; border-radius: 16px; border: 1px solid #bfdbfe; color: #1e3a8a;">
                <strong>💡 Pro Tip:</strong> ${data.suggestion || "Focus on quantifying your achievements."}
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <button onclick="location.reload()" class="btn-primary" style="background: #475569;">Analyze Another Resume</button>
            </div>
        </div>
    `;

    // Remove old results if they exist
    const oldResults = document.querySelector('.results-container');
    if(oldResults) oldResults.remove();

    // Inject new results
    document.querySelector('.upload-wrapper').insertAdjacentHTML('beforeend', resultsHTML);
    
    // Smooth scroll to results
    document.querySelector('.results-container').scrollIntoView({ behavior: 'smooth' });
}

function getColor(score) {
    if(score >= 80) return '#10b981'; // Green
    if(score >= 60) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
}