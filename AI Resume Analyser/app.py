import os
import json
import google.generativeai as genai
from flask import Flask, request, jsonify
from flask_cors import CORS
import PyPDF2

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
# ⚠️ PASTE YOUR API KEY HERE
os.environ["GOOGLE_API_KEY"] = "AIzaSyB9Dh-lYOOsbBacHKGOiwe1du1G97dzeS0" 
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

# --- SMART MODEL SELECTOR (Fixes 404 Errors) ---
def get_active_model():
    try:
        print("🔍 Scanning for available Gemini models...")
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                # Prefer the new Flash model if available
                if 'flash' in m.name:
                    return m.name
                # Fallback to Pro if Flash isn't found
                if 'pro' in m.name:
                    return m.name
        # If no specific match, just take the first valid generative model
        return 'gemini-1.5-flash'
    except Exception as e:
        print(f"⚠️ Could not list models (Network/Key Error): {e}")
        return 'gemini-1.5-flash' # Ultimate fallback

active_model_name = get_active_model()
print(f"✅ USING MODEL: {active_model_name}")
model = genai.GenerativeModel(active_model_name)

def extract_text_from_pdf(pdf_file):
    try:
        reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            if page.extract_text():
                text += page.extract_text()
        return text
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""

@app.route('/analyze', methods=['POST'])
def analyze():
    print("\n--- NEW REQUEST RECEIVED ---")
    
    if 'resume' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['resume']
    job_desc = request.form.get('job_description', 'General Role')
    
    try:
        # 1. Extract Text
        resume_text = extract_text_from_pdf(file)
        if len(resume_text) < 50:
             return jsonify({"error": "Resume text is too short or empty."}), 400

        # 2. AI Prompt
        prompt = f"""
        Act as a professional Resume Reviewer.
        Analyze this resume against the Job Description: "{job_desc}".
        
        Return ONLY valid JSON (no markdown). Format:
        {{
            "score": 75,
            "summary": "2-3 sentences overview.",
            "strengths": ["Strength 1", "Strength 2", "Strength 3"],
            "weaknesses": ["Weakness 1", "Weakness 2", "Weakness 3"],
            "suggestion": "1 key tip to improve."
        }}

        RESUME TEXT:
        {resume_text}
        """

        # 3. Call AI
        print(f"Sending to {active_model_name}...")
        response = model.generate_content(prompt)
        
        # 4. Clean JSON
        raw_text = response.text.strip()
        if raw_text.startswith("```json"): raw_text = raw_text[7:]
        if raw_text.startswith("```"): raw_text = raw_text[3:]
        if raw_text.endswith("```"): raw_text = raw_text[:-3]
            
        data = json.loads(raw_text)
        print("Analysis Complete.")
        return jsonify(data)

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        return jsonify({"error": f"Server Error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)