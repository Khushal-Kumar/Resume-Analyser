import os
import json
import re
import google.generativeai as genai
from flask import Flask, request, jsonify
from flask_cors import CORS
import PyPDF2
import pypdf

app = Flask(__name__)
CORS(app)

# Default Fallback API Key
DEFAULT_API_KEY = "" #PASTE YOUR API KEY HERE
""

def extract_text_from_pdf(pdf_file):
    text = ""
    # Try pypdf first
    try:
        pdf_file.seek(0)
        reader = pypdf.PdfReader(pdf_file)
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
        if text.strip():
            print("[INFO] Extracted text successfully using pypdf")
            return text.strip()
    except Exception as e:
        print(f"[WARN] pypdf extraction failed: {e}")
        
    # Try PyPDF2 fallback
    try:
        pdf_file.seek(0)
        reader = PyPDF2.PdfReader(pdf_file)
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
        print("[INFO] Extracted text successfully using PyPDF2")
        return text.strip()
    except Exception as e:
        print(f"[WARN] PyPDF2 extraction failed: {e}")
        return ""

def clean_json_response(raw_text):
    cleaned = raw_text.strip()
    # Remove markdown fence if present
    cleaned = re.sub(r'^```json\s*', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'^```\s*', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\s*```$', '', cleaned, flags=re.IGNORECASE)
    return cleaned.strip()

def get_mock_analysis(resume_text, job_desc):
    # Determine mock score based on keyword match simulation
    score = 78
    if "resume" in resume_text.lower():
        score = 82
    if "developer" in resume_text.lower():
        score = 85
        
    return {
        "score": score,
        "summary": "This is a simulated resume analysis because the Gemini API key was invalid, rate-limited, or offline. The resume has strong layout structure but could benefit from more quantitative accomplishments.",
        "strengths": [
            "Clear section headings and contact information",
            "Strong focus on Python and Web development technologies",
            "Good educational background and relevant project descriptions"
        ],
        "weaknesses": [
            "Lack of quantified achievements (e.g., 'improved speed by 20%')",
            "Skills section could be more organized by technical category",
            "Missing key ATS-friendly action verbs at the start of bullet points"
        ],
        "suggestion": "Add concrete metrics and percentages to your experience bullet points to demonstrate measurable impact.",
        "is_mock": True
    }

@app.route('/analyze', methods=['POST'])
def analyze():
    print("\n--- NEW REQUEST RECEIVED ---")
    
    if 'resume' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['resume']
    job_desc = request.form.get('job_description', 'General Role').strip()
    
    # Get API key: Header -> Form -> Env -> Default
    api_key = request.headers.get('X-Gemini-API-Key')
    if not api_key:
        api_key = request.form.get('api_key')
    if not api_key or api_key.strip() == "":
        api_key = os.environ.get("GOOGLE_API_KEY", DEFAULT_API_KEY)
        
    try:
        # 1. Extract Text
        resume_text = extract_text_from_pdf(file)
        if len(resume_text) < 50:
             if file.filename == 'sample_resume.pdf':
                 print("[INFO] Sample resume uploaded, returning mock analysis.")
                 res = get_mock_analysis("John Doe Developer Python React Flask AWS", job_desc)
                 res["parsed_text"] = "John Doe - Senior Software Engineer\nEmail: john.doe@email.com\nSkills: Python, Flask, React, Docker, AWS"
                 return jsonify(res)
             return jsonify({"error": "Resume text is too short or empty. Please ensure it's a text-based PDF."}), 400

        # If API key is empty or looks like a placeholder, fall back to mock
        if not api_key or api_key == "YOUR_API_KEY":
            print("[INFO] No valid API Key configured, returning mock analysis.")
            res = get_mock_analysis(resume_text, job_desc)
            res["parsed_text"] = resume_text
            return jsonify(res)

        # 2. Configure Gemini API
        genai.configure(api_key=api_key)
        
        # Determine the model dynamically
        active_model_name = 'gemini-1.5-flash'
        try:
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    if 'flash' in m.name:
                        active_model_name = m.name
                        break
        except Exception as e:
            print(f"[WARN] Could not list models dynamically: {e}. Defaulting to gemini-1.5-flash.")

        model = genai.GenerativeModel(active_model_name)
        
        # 3. AI Prompt
        prompt = f"""
        Act as a professional ATS (Applicant Tracking System) reviewer and recruiter.
        Analyze the candidate's resume text against the Job Description: "{job_desc}".
        
        Provide a comprehensive critique. You must return ONLY a valid JSON object. Do not wrap in markdown blocks.
        
        JSON Schema:
        {{
            "score": <integer between 0 and 100 representing job description alignment and formatting quality>,
            "summary": "<2-3 sentence professional summary of alignment>",
            "strengths": ["list of 3 specific strengths in the resume matching the job"],
            "weaknesses": ["list of 3 specific weaknesses or gaps relative to the job requirements"],
            "suggestion": "<1 key actionable recommendation to improve this resume>"
        }}

        RESUME TEXT:
        {resume_text}
        """

        # 4. Call AI
        print(f"[INFO] Sending request to model: {active_model_name}...")
        response = model.generate_content(prompt)
        
        # 5. Clean & Parse JSON
        raw_text = response.text
        cleaned_text = clean_json_response(raw_text)
        
        try:
            data = json.loads(cleaned_text)
        except json.JSONDecodeError as je:
            print(f"[WARN] JSON parsing failed on raw text. Attempting regex extract. Error: {je}")
            match = re.search(r'\{.*\}', cleaned_text, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
            else:
                raise je
                
        print("[INFO] Analysis Complete.")
        data["parsed_text"] = resume_text
        return jsonify(data)

    except Exception as e:
        print(f"[ERROR] ERROR OCCURRED: {e}")
        # If API key failed or quota exceeded, fall back to mock data
        try:
            file.seek(0)
            resume_text = extract_text_from_pdf(file)
            mock_data = get_mock_analysis(resume_text, job_desc)
            mock_data["parsed_text"] = resume_text
            mock_data["error_info"] = str(e)
            return jsonify(mock_data)
        except Exception as inner_e:
            return jsonify({"error": f"Server Error: {str(e)}", "detail": str(inner_e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)