from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ollama

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store current question
current_question = ""

# ---------------- HOME ---------------- #

@app.get("/")
def home():
    return {"message": "AI Interviewer Running"}

# ---------------- GET QUESTION ---------------- #

@app.get("/question")
def get_question():

    global current_question

    response = ollama.chat(
        model="llama3.2:3b",
        messages=[
            {
                "role": "system",
                "content": "You are a professional Python interviewer."
            },
            {
                "role": "user",
                "content": "Ask ONLY one beginner or intermediate Python interview question. Do not give the answer."
            }
        ]
    )

    current_question = response["message"]["content"]

    return {
        "question": current_question
    }

# ---------------- ANSWER MODEL ---------------- #

class Answer(BaseModel):
    answer: str

# ---------------- EVALUATE ---------------- #

@app.post("/evaluate")
def evaluate(data: Answer):

    prompt = f"""
You are an interviewer.

Question:

{current_question}

Candidate Answer:

{data.answer}

Evaluate the answer.

Return ONLY in this format:

Score: x/10

Feedback:
(2-3 lines)

Correct Answer:
(short answer)
"""

    response = ollama.chat(
        model="llama3.2:3b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return {
        "feedback": response["message"]["content"]
    }